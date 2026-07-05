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

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", match.team_id)
    .order("number", { ascending: true, nullsFirst: false })
    .returns<Player[]>();

  return <LiveMatch match={match} players={players ?? []} />;
}
