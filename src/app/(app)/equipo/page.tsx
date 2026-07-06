import Link from "next/link";
import Screen from "@/components/ui/Screen";
import { ListGroup, ListRow } from "@/components/ui/List";
import { EmptyState } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { getMyTeams, getSessionProfile } from "@/lib/auth";
import type { Player } from "@/lib/types/database";

export const metadata = { title: "Equipo" };

export default async function EquipoPage() {
  const { profile } = await getSessionProfile();
  const myTeams = await getMyTeams();
  const supabase = await createClient();

  // Mis fichas de roster (para "Mi ficha" por equipo).
  const { data: myFichas } = await supabase
    .from("players")
    .select("id, team_id")
    .eq("profile_id", profile?.id ?? "")
    .returns<Pick<Player, "id" | "team_id">[]>();
  const fichaOf = (teamId: string) =>
    (myFichas ?? []).find((f) => f.team_id === teamId)?.id;

  if (myTeams.length === 0) {
    return (
      <Screen title="Equipo">
        <EmptyState icon="🛡️">
          Aún no perteneces a ningún equipo. Pídele a tu club una invitación o que
          te asignen uno.
        </EmptyState>
      </Screen>
    );
  }

  // Si hay varios, se listan; con uno, se abre su panel directamente.
  const multi = myTeams.length > 1;

  return (
    <Screen title="Equipo" subtitle={multi ? "Tus equipos" : myTeams[0].name}>
      {myTeams.map((team) => {
        const fichaId = fichaOf(team.id);
        return (
          <div key={team.id} className="mb-5">
            {multi && (
              <p className="ios-section-caption mb-1.5 px-1">{team.name}</p>
            )}
            <ListGroup>
              <ListRow
                href={`/teams/${team.id}`}
                title="Plantilla"
                subtitle="Jugadores del equipo"
                leading={<span className="text-xl">👥</span>}
              />
              <ListRow
                href={`/stats?team=${team.id}`}
                title="Estadísticas"
                subtitle="Por jugador"
                leading={<span className="text-xl">📊</span>}
              />
              <ListRow
                href={`/standings?team=${team.id}`}
                title="Clasificación"
                subtitle="Tabla de la liga"
                leading={<span className="text-xl">🏆</span>}
              />
              <ListRow
                href="/trainings"
                title="Entrenamientos"
                subtitle="Sesiones y asistencia"
                leading={<span className="text-xl">🏋️</span>}
              />
              <ListRow
                href="/matches"
                title="Partidos"
                subtitle="Calendario y resultados"
                leading={<span className="text-xl">🤾</span>}
              />
              {fichaId && (
                <ListRow
                  href={`/players/${fichaId}`}
                  title="Mi ficha"
                  subtitle="Tus estadísticas y faltas"
                  leading={<span className="text-xl">⭐</span>}
                />
              )}
            </ListGroup>
          </div>
        );
      })}

      {!multi && (
        <Link
          href={`/teams/${myTeams[0].id}`}
          className="tap block text-center text-[14px] text-brand"
        >
          Abrir plantilla completa →
        </Link>
      )}
    </Screen>
  );
}
