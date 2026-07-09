"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canCapture, getSessionProfile } from "@/lib/auth";
import type { Player, TrainingPhase } from "@/lib/types/database";

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
      // Conserva solo las pizarras con contenido (trazos o fichas).
      const boards = (p.boards ?? [])
        .filter(
          (b) =>
            b.drawing &&
            ((b.drawing.strokes?.length ?? 0) > 0 ||
              (b.drawing.tokens?.length ?? 0) > 0)
        )
        .map((b) => ({
          drawing: b.drawing,
          description: b.description?.trim() || null,
        }));
      return {
        name: String(p.name).trim(),
        minutes: Number(p.minutes) || 0,
        ...(boards.length > 0 ? { boards } : {}),
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

  revalidatePath(`/trainings/${trainingId}`);
  revalidatePath("/trainings");
  return {};
}
