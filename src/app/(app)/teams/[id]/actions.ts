"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PlayerFormState = { error?: string };

/** Refresca tanto la vista de plantilla como la pantalla de edición. */
function revalidateRoster(teamId: string) {
  revalidatePath(`/teams/${teamId}`);
  revalidatePath(`/teams/${teamId}/edit`);
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
  const position = String(formData.get("position") ?? "").trim() || null;

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
    position,
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
  const position = String(formData.get("position") ?? "").trim() || null;

  if (!playerId) return { error: "Jugador no válido." };
  if (!name) return { error: "Escribe el nombre del jugador." };

  const number = numberRaw === "" ? null : Number(numberRaw);
  if (number !== null && (!Number.isInteger(number) || number < 0)) {
    return { error: "El dorsal debe ser un número válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("players")
    .update({ name, number, position })
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

/** Elimina un jugador (RLS: solo quien gestiona el equipo). */
export async function deletePlayerAction(formData: FormData): Promise<void> {
  const playerId = String(formData.get("playerId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  if (!playerId) return;

  const supabase = await createClient();
  await supabase.from("players").delete().eq("id", playerId);
  revalidateRoster(teamId);
}
