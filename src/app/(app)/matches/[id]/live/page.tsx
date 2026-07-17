import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canCapture, getSessionProfile } from "@/lib/auth";
import type { Match, Player } from "@/lib/types/database";
import LiveMatch from "./LiveMatch";

export const metadata = { title: "En vivo" };

export default async function LiveMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await getSessionProfile();
  if (!canCapture(profile)) redirect(`/matches/${id}`); // solo staff/técnico capturan

  const supabase = await createClient();

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .maybeSingle<Match>();
  if (!match) notFound();

  const [{ data: players }, { data: squad }] = await Promise.all([
    supabase
      .from("players")
      .select("*")
      .eq("team_id", match.team_id)
      .order("number", { ascending: true, nullsFirst: false })
      .returns<Player[]>(),
    supabase
      .from("match_squad")
      .select("player_id")
      .eq("match_id", id)
      .returns<{ player_id: string }[]>(),
  ]);

  return (
    <LiveMatch
      match={match}
      players={players ?? []}
      squadIds={(squad ?? []).map((s) => s.player_id)}
    />
  );
}
