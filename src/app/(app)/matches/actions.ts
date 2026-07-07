"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canCapture, getSessionProfile, isStaff } from "@/lib/auth";
import type { StatEventType } from "@/lib/types/database";

export type MatchFormState = { error?: string };

/** Crea un partido para un equipo (RLS: can_manage_team). */
export async function createMatchAction(
  _prev: MatchFormState,
  formData: FormData
): Promise<MatchFormState> {
  const teamId = String(formData.get("teamId") ?? "");
  const opponent = String(formData.get("opponent") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim() || null;

  if (!teamId) return { error: "Selecciona un equipo." };
  if (!opponent) return { error: "Escribe el rival." };
  if (!date) return { error: "Indica la fecha." };

  const { profile } = await getSessionProfile();
  if (!isStaff(profile)) return { error: "Sin permisos." };

  const supabase = await createClient();
  const { error } = await supabase.from("matches").insert({
    team_id: teamId,
    opponent,
    date: new Date(date).toISOString(),
    location,
    status: "scheduled",
  });

  if (error) return { error: error.message };
  revalidatePath("/matches");
  redirect("/matches");
}

/** Edita un partido programado (rival, fecha, lugar). */
export async function editMatchAction(
  _prev: MatchFormState,
  formData: FormData
): Promise<MatchFormState> {
  const matchId = String(formData.get("matchId") ?? "");
  const opponent = String(formData.get("opponent") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim() || null;
  if (!matchId) return { error: "Partido no válido." };
  if (!opponent) return { error: "Escribe el rival." };
  if (!date) return { error: "Indica la fecha." };

  const { profile } = await getSessionProfile();
  if (!isStaff(profile)) return { error: "Sin permisos." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({
      opponent,
      date: new Date(date).toISOString(),
      location,
    })
    .eq("id", matchId);

  if (error) return { error: error.message };
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/matches");
  redirect(`/matches/${matchId}`);
}

/** Elimina un partido. Vuelve al calendario. */
export async function deleteMatchAction(formData: FormData): Promise<void> {
  const matchId = String(formData.get("matchId") ?? "");
  if (!matchId) return;
  const supabase = await createClient();
  await supabase.from("matches").delete().eq("id", matchId);
  revalidatePath("/matches");
  redirect("/matches");
}

export interface LiveEventInput {
  playerId: string | null;
  eventType: StatEventType;
  gameSecond: number;
}

/**
 * Persiste el partido en vivo: reemplaza los eventos del partido por los de la
 * sesión, actualiza el marcador y (opcionalmente) marca el partido como finalizado.
 */
export async function saveLiveMatchAction(input: {
  matchId: string;
  ourScore: number;
  oppScore: number;
  finish: boolean;
  events: LiveEventInput[];
}): Promise<{ error?: string }> {
  const { matchId, ourScore, oppScore, finish, events } = input;
  if (!matchId) return { error: "Partido no válido." };

  const { profile } = await getSessionProfile();
  if (!canCapture(profile)) return { error: "Sin permisos." };

  const supabase = await createClient();

  // Reemplaza los eventos existentes por los de esta sesión (idempotente).
  const { error: delError } = await supabase
    .from("stats_events")
    .delete()
    .eq("match_id", matchId);
  if (delError) return { error: delError.message };

  if (events.length > 0) {
    const rows = events.map((e) => ({
      match_id: matchId,
      player_id: e.playerId,
      event_type: e.eventType,
      game_second: e.gameSecond,
    }));
    const { error: insError } = await supabase.from("stats_events").insert(rows);
    if (insError) return { error: insError.message };
  }

  const { error: matchError } = await supabase
    .from("matches")
    .update({
      our_score: ourScore,
      opp_score: oppScore,
      status: finish ? "finished" : "live",
    })
    .eq("id", matchId);
  if (matchError) return { error: matchError.message };

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/matches");
  return {};
}
