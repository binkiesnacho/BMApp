import Screen from "@/components/ui/Screen";
import { TileGrid, Tile } from "@/components/ui/Tile";
import { EmptyState } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import type { Player, Team } from "@/lib/types/database";

export const metadata = { title: "Club" };

export default async function TeamsPage() {
  const supabase = await createClient();
  // Cualquier miembro del club ve todos los equipos (lectura). RLS lo garantiza.
  const { data } = await supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: true })
    .returns<Team[]>();
  const teams: Team[] = data ?? [];

  const { data: players } = await supabase
    .from("players")
    .select("id, team_id")
    .returns<Pick<Player, "id" | "team_id">[]>();
  const count = (teamId: string) =>
    (players ?? []).filter((p) => p.team_id === teamId).length;

  return (
    <Screen title="Club" subtitle="Equipos del club">
      {teams.length === 0 ? (
        <EmptyState icon="🛡️">Todavía no hay equipos.</EmptyState>
      ) : (
        <TileGrid>
          {teams.map((team) => (
            <Tile
              key={team.id}
              href={`/teams/${team.id}`}
              title={team.name}
              subtitle={`${count(team.id)} jugadores`}
            />
          ))}
        </TileGrid>
      )}
    </Screen>
  );
}
