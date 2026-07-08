"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

function revalidateFor(fd: FormData) {
  const trainingId = String(fd.get("trainingId") ?? "");
  const matchId = String(fd.get("matchId") ?? "");
  const playerId = String(fd.get("playerId") ?? "");
  if (trainingId) revalidatePath(`/trainings/${trainingId}`);
  if (matchId) revalidatePath(`/matches/${matchId}`);
  if (playerId) revalidatePath(`/players/${playerId}`);
}

/** Añade una observación (RLS: solo cuerpo técnico del equipo). */
export async function addObservationAction(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const sourceType = String(formData.get("sourceType") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const trainingId = String(formData.get("trainingId") ?? "") || null;
  const matchId = String(formData.get("matchId") ?? "") || null;
  const playerId = String(formData.get("playerId") ?? "") || null;
  const occurredAt = String(formData.get("occurredAt") ?? "") || null;

  if (!teamId || !["training", "match", "player"].includes(sourceType) || !body) {
    return;
  }
  const { profile } = await getSessionProfile();
  if (!profile) return;

  const supabase = await createClient();
  await supabase.from("observations").insert({
    team_id: teamId,
    author_id: profile.id,
    player_id: playerId,
    source_type: sourceType,
    training_id: trainingId,
    match_id: matchId,
    body,
    occurred_at: occurredAt ?? new Date().toISOString(),
  });
  revalidateFor(formData);
}

/** Elimina una observación (autor o cuerpo técnico del equipo). */
export async function deleteObservationAction(formData: FormData): Promise<void> {
  const id = String(formData.get("observationId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("observations").delete().eq("id", id);
  revalidateFor(formData);
}
