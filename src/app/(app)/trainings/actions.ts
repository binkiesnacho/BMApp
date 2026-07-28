"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canCapture, getSessionProfile } from "@/lib/auth";
import type {
  TrainingBoard,
  TrainingDrawing,
  TrainingExercise,
  TrainingPhase,
  Player,
} from "@/lib/types/database";

/** ¿La pizarra tiene algo dibujado? (trazos, fichas o fotogramas) */
function drawingHasContent(d: TrainingDrawing | null | undefined): d is TrainingDrawing {
  if (!d) return false;
  if ((d.strokes?.length ?? 0) > 0 || (d.tokens?.length ?? 0) > 0) return true;
  return (d.frames ?? []).some(
    (f) => f.strokes.length > 0 || f.tokens.length > 0
  );
}

/** Deja solo las pizarras con dibujo, normalizando su descripción. */
function cleanBoards(boards: TrainingBoard[] | undefined): TrainingBoard[] {
  return (boards ?? [])
    .filter((b) => drawingHasContent(b.drawing))
    .map((b) => ({ drawing: b.drawing, description: b.description?.trim() || null }));
}

/** Normaliza un ejercicio; devuelve null si queda totalmente vacío. */
function cleanExercise(ex: TrainingExercise): TrainingExercise | null {
  const description = ex.description?.trim() || null;
  const name = ex.name?.trim() || null;
  const boards = cleanBoards(ex.boards);
  const progressions = (ex.progressions ?? [])
    .map((pr) => ({
      description: pr.description?.trim() || null,
      boards: cleanBoards(pr.boards),
    }))
    .filter((pr) => pr.description || pr.boards.length > 0);
  if (!description && !name && boards.length === 0 && progressions.length === 0) {
    return null;
  }
  return {
    ...(name ? { name } : {}),
    ...(description ? { description } : {}),
    boards,
    ...(progressions.length > 0 ? { progressions } : {}),
  };
}

export interface CreateTrainingInput {
  teamId: string;
  date: string;
  title: string;
  description: string;
  phases: TrainingPhase[];
  objectives: string[];
}

/** Crea un entrenamiento. Devuelve el id para navegar al detalle. */
export async function createTrainingAction(
  input: CreateTrainingInput
): Promise<{ error?: string; id?: string }> {
  const { profile } = await getSessionProfile();
  if (!canCapture(profile)) return { error: "Sin permisos." };
  if (!input.teamId) return { error: "Selecciona un equipo." };
  if (!input.date) return { error: "Indica la fecha." };

  const phases = input.phases
    .map((p) => {
      const exercises = (p.exercises ?? [])
        .map(cleanExercise)
        .filter((ex): ex is TrainingExercise => ex !== null);
      // Compatibilidad: si aún llegan pizarras sueltas (formato antiguo), se
      // conservan tal cual.
      const boards = cleanBoards(p.boards);
      return {
        name: String(p.name).trim(),
        minutes: Number(p.minutes) || 0,
        ...(boards.length > 0 ? { boards } : {}),
        ...(exercises.length > 0 ? { exercises } : {}),
      };
    })
    .filter((p) => p.name);
  const objectives = input.objectives.map((o) => o.trim()).filter(Boolean);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trainings")
    .insert({
      team_id: input.teamId,
      date: new Date(input.date).toISOString(),
      title: input.title.trim() || null,
      description: input.description.trim() || null,
      phases,
      objectives,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) return { error: error.message };
  revalidatePath("/trainings");
  return { id: data.id };
}

/** Elimina un entrenamiento. */
export async function deleteTrainingAction(formData: FormData): Promise<void> {
  const trainingId = String(formData.get("trainingId") ?? "");
  if (!trainingId) return;
  const supabase = await createClient();
  await supabase.from("trainings").delete().eq("id", trainingId);
  revalidatePath("/trainings");
}

/**
 * Guarda la asistencia: los jugadores en attendedIds constan como presentes,
 * el resto de la plantilla como falta (attended=false). Idempotente.
 */
export async function saveAttendanceAction(
  trainingId: string,
  attendedIds: string[]
): Promise<{ error?: string }> {
  const { profile } = await getSessionProfile();
  if (!canCapture(profile)) return { error: "Sin permisos." };
  if (!trainingId) return { error: "Entrenamiento no válido." };

  const supabase = await createClient();

  const { data: training } = await supabase
    .from("trainings")
    .select("team_id")
    .eq("id", trainingId)
    .maybeSingle<{ team_id: string }>();
  if (!training) return { error: "Entrenamiento no encontrado." };

  const { data: players } = await supabase
    .from("players")
    .select("id")
    .eq("team_id", training.team_id)
    .returns<Pick<Player, "id">[]>();

  const attended = new Set(attendedIds);
  const rows = (players ?? []).map((p) => ({
    training_id: trainingId,
    player_id: p.id,
    attended: attended.has(p.id),
  }));

  const { error: delErr } = await supabase
    .from("training_attendance")
    .delete()
    .eq("training_id", trainingId);
  if (delErr) return { error: delErr.message };

  if (rows.length > 0) {
    const { error: insErr } = await supabase
      .from("training_attendance")
      .insert(rows);
    if (insErr) return { error: insErr.message };
  }

  // Deja constancia de a qué hora se pasó lista y quién lo hizo, para que otros
  // entrenadores y administradores puedan consultarlo después.
  const { error: stampErr } = await supabase
    .from("trainings")
    .update({
      attendance_taken_at: new Date().toISOString(),
      attendance_by: profile!.id,
    })
    .eq("id", trainingId);
  if (stampErr) return { error: stampErr.message };

  revalidatePath(`/trainings/${trainingId}`);
  revalidatePath("/trainings");
  return {};
}

/**
 * Registra un adjunto ya subido al bucket privado `training-files`.
 * La subida la hace el cliente; aquí solo guardamos la fila (RLS comprueba
 * que quien lo hace puede capturar en el equipo del entrenamiento).
 */
export async function addTrainingFileAction(input: {
  trainingId: string;
  path: string;
  name: string;
  mime: string;
  sizeBytes: number;
}): Promise<{ error?: string }> {
  const { profile } = await getSessionProfile();
  if (!canCapture(profile)) return { error: "Sin permisos." };
  if (!input.trainingId || !input.path) return { error: "Adjunto no válido." };

  const supabase = await createClient();
  const { error } = await supabase.from("training_files").insert({
    training_id: input.trainingId,
    path: input.path,
    name: input.name,
    mime: input.mime,
    size_bytes: input.sizeBytes,
    author_id: profile!.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/trainings/${input.trainingId}`);
  return {};
}

/** Elimina un adjunto (fila + objeto en Storage). */
export async function deleteTrainingFileAction(
  fileId: string
): Promise<{ error?: string }> {
  const { profile } = await getSessionProfile();
  if (!canCapture(profile)) return { error: "Sin permisos." };

  const supabase = await createClient();
  const { data: file } = await supabase
    .from("training_files")
    .select("id, training_id, path")
    .eq("id", fileId)
    .maybeSingle<{ id: string; training_id: string; path: string }>();
  if (!file) return { error: "Adjunto no encontrado." };

  // Storage primero: si falla, la fila sigue y se puede reintentar.
  const { error: stErr } = await supabase.storage
    .from("training-files")
    .remove([file.path]);
  if (stErr) return { error: stErr.message };

  const { error } = await supabase.from("training_files").delete().eq("id", fileId);
  if (error) return { error: error.message };

  revalidatePath(`/trainings/${file.training_id}`);
  return {};
}

/** URLs firmadas (1 h) para ver/descargar los adjuntos de un entrenamiento. */
export async function signTrainingFilesAction(
  paths: string[]
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("training-files")
    .createSignedUrls(paths, 3600);
  const map: Record<string, string> = {};
  for (const s of data ?? []) {
    if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
  }
  return map;
}
