import Screen from "@/components/ui/Screen";
import { ListGroup, ListRow } from "@/components/ui/List";
import { EmptyState } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { canAdminister, getSessionProfile, isPlayer } from "@/lib/auth";
import CreateTeamForm from "./CreateTeamForm";
import type { Player, Team } from "@/lib/types/database";

export const metadata = { title: "Equipos" };

export default async function TeamsPage() {
  const { profile } = await getSessionProfile();
  const isAdmin = canAdminister(profile);
  const player = isPlayer(profile);

  const supabase = await createClient();
  let query = supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: true });
  let teams: Team[] = [];
  if (player) {
    if (profile?.team_id) {
      const { data } = await query.eq("id", profile.team_id).returns<Team[]>();
      teams = data ?? [];
    }
  } else {
    if (!isAdmin && profile) query = query.eq("coach_id", profile.id);
    const { data } = await query.returns<Team[]>();
    teams = data ?? [];
  }

  // Nº de jugadores por equipo.
  const { data: players } = await supabase
    .from("players")
    .select("id, team_id")
    .returns<Pick<Player, "id" | "team_id">[]>();
  const count = (teamId: string) =>
    (players ?? []).filter((p) => p.team_id === teamId).length;

  return (
    <Screen title={player ? "Mi equipo" : "Equipos"}>
      {isAdmin && (
        <div className="mb-4">
          <CreateTeamForm />
        </div>
      )}

      {teams.length === 0 ? (
        <EmptyState icon="🛡️">
          {isAdmin
            ? "Aún no hay equipos. Crea el primero arriba."
            : "No tienes equipos asignados todavía."}
        </EmptyState>
      ) : (
        <ListGroup>
          {teams.map((team) => (
            <ListRow
              key={team.id}
              href={`/teams/${team.id}`}
              title={team.name}
              subtitle={`${count(team.id)} jugadores`}
              leading={
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15 text-[15px]">
                  🛡️
                </span>
              }
            />
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}
