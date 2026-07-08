import type { createClient } from "@/lib/supabase/server";
import type { Observation } from "@/lib/types/database";

type SB = Awaited<ReturnType<typeof createClient>>;

export interface EnrichedObservation extends Observation {
  authorName: string;
  playerName: string | null;
}

/**
 * Carga observaciones (RLS: solo cuerpo técnico) filtradas por entreno, partido
 * o jugador, resolviendo el nombre del autor y del jugador ligado.
 */
export async function loadObservations(
  supabase: SB,
  filter: { trainingId?: string; matchId?: string; playerId?: string }
): Promise<EnrichedObservation[]> {
  let q = supabase
    .from("observations")
    .select("*")
    .order("occurred_at", { ascending: false });
  if (filter.trainingId) q = q.eq("training_id", filter.trainingId);
  if (filter.matchId) q = q.eq("match_id", filter.matchId);
  if (filter.playerId) q = q.eq("player_id", filter.playerId);

  const { data } = await q.returns<Observation[]>();
  const obs = data ?? [];
  if (obs.length === 0) return [];

  const authorIds = [...new Set(obs.map((o) => o.author_id).filter(Boolean))] as string[];
  const playerIds = [...new Set(obs.map((o) => o.player_id).filter(Boolean))] as string[];

  const [authorsRes, playersRes] = await Promise.all([
    authorIds.length
      ? supabase.from("profiles").select("id, name").in("id", authorIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    playerIds.length
      ? supabase.from("players").select("id, name").in("id", playerIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const authors = (authorsRes.data ?? []) as { id: string; name: string }[];
  const players = (playersRes.data ?? []) as { id: string; name: string }[];

  return obs.map((o) => ({
    ...o,
    authorName: authors.find((a) => a.id === o.author_id)?.name ?? "Cuerpo técnico",
    playerName: o.player_id
      ? players.find((p) => p.id === o.player_id)?.name ?? "Jugador"
      : null,
  }));
}
