import Screen from "@/components/ui/Screen";
import { ListGroup, ListRow } from "@/components/ui/List";
import { EmptyState } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { canAdminister, getSessionProfile } from "@/lib/auth";
import CreateTeamForm from "./CreateTeamForm";
import type { Player, Team } from "@/lib/types/database";

export const metadata = { title: "Equipos" };

export default async function TeamsPage() {
  const { profile } = await getSessionProfile();
  const isAdmin = canAdminister(profile);

  const supabase = await createClient();
  // Cualquier miembro del club ve todos los equipos (lectura). RLS lo garantiza.
  const { data } = await supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: true })
    .returns<Team[]>();
  const teams: Team[] = data ?? [];

  // Nº de jugadores por equipo.
  const { data: players } = await supabase
    .from("players")
    .select("id, team_id")
    .returns<Pick<Player, "id" | "team_id">[]>();
  const count = (teamId: string) =>
    (players ?? []).filter((p) => p.team_id === teamId).length;

  return (
    <Screen title="Equipos">
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
