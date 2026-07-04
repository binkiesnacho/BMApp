"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PlayerFormState = { error?: string };

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

  revalidatePath(`/teams/${teamId}`);
  return {};
}

/** Elimina un jugador (RLS: solo quien gestiona el equipo). */
export async function deletePlayerAction(formData: FormData): Promise<void> {
  const playerId = String(formData.get("playerId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  if (!playerId) return;

  const supabase = await createClient();
  await supabase.from("players").delete().eq("id", playerId);
  revalidatePath(`/teams/${teamId}`);
}
