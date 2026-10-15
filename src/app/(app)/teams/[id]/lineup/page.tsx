import { notFound } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { createClient } from "@/lib/supabase/server";
import { canCapture, getSessionProfile } from "@/lib/auth";
import LineupEditor from "./LineupEditor";
import type { Player, Team, TeamLineup } from "@/lib/types/database";

export const metadata = { title: "Alineación" };

export default async function LineupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await getSessionProfile();
  const canEdit = canCapture(profile);

  const supabase = await createClient();
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .maybeSingle<Team>();
  if (!team) notFound();

  const [{ data: players }, { data: lineup }] = await Promise.all([
    supabase
      .from("players")
      .select("id, name, number, positions")
      .eq("team_id", id)
      .order("number", { ascending: true, nullsFirst: false })
      .returns<Pick<Player, "id" | "name" | "number" | "positions">[]>(),
    supabase
      .from("team_lineups")
      .select("*")
      .eq("team_id", id)
      .maybeSingle<TeamLineup>(),
  ]);

  return (
    <Screen title="Alineación" subtitle={team.name} back={`/equipo/${team.id}`}>
      <LineupEditor
        teamId={team.id}
        players={players ?? []}
        lineup={lineup ?? null}
        canEdit={canEdit}
      />
    </Screen>
  );
}
