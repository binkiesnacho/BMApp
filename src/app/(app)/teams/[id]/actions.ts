"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

import { DEFENSE_SYSTEMS, PLAYER_POSITIONS } from "@/lib/types/database";
import type { DefenseSystem } from "@/lib/types/database";

export type PlayerFormState = { error?: string };

/** Refresca la plantilla, su edición y la alineación (depende de las posiciones). */
function revalidateRoster(teamId: string) {
  revalidatePath(`/teams/${teamId}`);
  revalidatePath(`/teams/${teamId}/edit`);
  revalidatePath(`/teams/${teamId}/lineup`);
}

/** Lee las posiciones marcadas del formulario, validadas y sin duplicados. */
function readPositions(formData: FormData): string[] {
  const picked = formData.getAll("positions").map((v) => String(v));
  const valid = (PLAYER_POSITIONS as readonly string[]).filter((p) =>
    picked.includes(p)
  );
  return [...new Set(valid)];
}

/**
 * Añade un jugador a un equipo. La RLS (can_manage_team) garantiza que solo
 * el admin del club o el coach asignado a ESE equipo pueda insertar.
 */
export async function addPlayerAction(
  _prev: PlayerFormState,
  formData: FormData
): Promise<PlayerFormState> {
  const teamId = String(formData.get("teamId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const numberRaw = String(formData.get("number") ?? "").trim();
  const positions = readPositions(formData);

  if (!teamId) return { error: "Equipo no válido." };
  if (!name) return { error: "Escribe el nombre del jugador." };

  const number = numberRaw === "" ? null : Number(numberRaw);
  if (number !== null && (!Number.isInteger(number) || number < 0)) {
    return { error: "El dorsal debe ser un número válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("players").insert({
    team_id: teamId,
    name,
    number,
    positions,
    position: positions[0] ?? null,
  });

  if (error) return { error: error.message };

  revalidateRoster(teamId);
  return {};
}

/** Edita un jugador existente (nombre, dorsal, posición). */
export async function editPlayerAction(
  _prev: PlayerFormState,
  formData: FormData
): Promise<PlayerFormState> {
  const playerId = String(formData.get("playerId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const numberRaw = String(formData.get("number") ?? "").trim();
  const positions = readPositions(formData);

  if (!playerId) return { error: "Jugador no válido." };
  if (!name) return { error: "Escribe el nombre del jugador." };

  const number = numberRaw === "" ? null : Number(numberRaw);
  if (number !== null && (!Number.isInteger(number) || number < 0)) {
    return { error: "El dorsal debe ser un número válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("players")
    .update({ name, number, positions, position: positions[0] ?? null })
    .eq("id", playerId);

  if (error) return { error: error.message };

  revalidateRoster(teamId);
  return {};
}

/**
 * Vincula (o desvincula) una cuenta de jugador con una ficha del roster.
 * Antes de asignar, libera la cuenta de cualquier otra ficha (índice único).
 */
export async function linkPlayerAccountAction(
  formData: FormData
): Promise<void> {
  const playerId = String(formData.get("playerId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const profileId = String(formData.get("profileId") ?? "");
  if (!playerId) return;

  const supabase = await createClient();

  if (profileId === "") {
    await supabase
      .from("players")
      .update({ profile_id: null })
      .eq("id", playerId);
  } else {
    // Libera esa cuenta de otras fichas del equipo para no romper el índice único.
    await supabase
      .from("players")
      .update({ profile_id: null })
      .eq("team_id", teamId)
      .eq("profile_id", profileId);
    await supabase
      .from("players")
      .update({ profile_id: profileId })
      .eq("id", playerId);
  }

  revalidateRoster(teamId);
}

/**
 * Guarda la alineación de un equipo (ataque + sistema defensivo + defensa).
 * Se llama automáticamente en cada cambio; la RLS (can_capture_team) decide
 * quién puede escribir. Solo se conservan ids de jugadores del propio equipo.
 */
export async function saveLineupAction(input: {
  teamId: string;
  defenseSystem: string;
  attack: Record<string, string>;
  defense: Record<string, string>;
}): Promise<{ error?: string }> {
  const { teamId } = input;
  if (!teamId) return { error: "Equipo no válido." };

  const defenseSystem: DefenseSystem = (
    DEFENSE_SYSTEMS as readonly string[]
  ).includes(input.defenseSystem)
    ? (input.defenseSystem as DefenseSystem)
    : "6-0";

  const supabase = await createClient();

  // Solo se guardan huecos ocupados por jugadores que existen en el equipo.
  const { data: roster } = await supabase
    .from("players")
    .select("id")
    .eq("team_id", teamId)
    .returns<{ id: string }[]>();
  const valid = new Set((roster ?? []).map((r) => r.id));
  const clean = (m: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(m ?? {}).filter(([, pid]) => valid.has(pid))
    );

  const { error } = await supabase.from("team_lineups").upsert(
    {
      team_id: teamId,
      defense_system: defenseSystem,
      attack: clean(input.attack),
      defense: clean(input.defense),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "team_id" }
  );
  if (error) return { error: error.message };
  return {};
}

/** Elimina un jugador (RLS: solo quien gestiona el equipo). */
export async function deletePlayerAction(formData: FormData): Promise<void> {
  const playerId = String(formData.get("playerId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  if (!playerId) return;

  const supabase = await createClient();
  await supabase.from("players").delete().eq("id", playerId);
  revalidateRoster(teamId);
}
