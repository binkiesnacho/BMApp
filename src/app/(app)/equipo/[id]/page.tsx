import { notFound } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { ListGroup, ListRow } from "@/components/ui/List";
import { createClient } from "@/lib/supabase/server";
import { getMyTeams, getSessionProfile } from "@/lib/auth";
import type { Player, Team } from "@/lib/types/database";

export const metadata = { title: "Equipo" };

export default async function TeamHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ profile }, myTeams] = await Promise.all([
    getSessionProfile(),
    getMyTeams(),
  ]);
  const supabase = await createClient();

  const [{ data: team }, { data: ficha }] = await Promise.all([
    supabase.from("teams").select("*").eq("id", id).maybeSingle<Team>(),
    supabase
      .from("players")
      .select("id")
      .eq("team_id", id)
      .eq("profile_id", profile?.id ?? "")
      .maybeSingle<Pick<Player, "id">>(),
  ]);
  if (!team) notFound();

  // Solo mostramos "Atrás → Equipos" si el usuario tiene varios equipos.
  const back = myTeams.length > 1 ? "/equipo" : undefined;

  return (
    <Screen title={team.name} subtitle="Secciones del equipo" back={back}>
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
          href={`/matches?team=${team.id}`}
          title="Partidos"
          subtitle="Calendario y resultados"
          leading={<span className="text-xl">🤾</span>}
        />
        <ListRow
          href="/trainings"
          title="Entrenamientos"
          subtitle="Sesiones y asistencia"
          leading={<span className="text-xl">🏋️</span>}
        />
        {ficha && (
          <ListRow
            href={`/players/${ficha.id}`}
            title="Mi ficha"
            subtitle="Tus estadísticas y faltas"
            leading={<span className="text-xl">⭐</span>}
          />
        )}
      </ListGroup>
    </Screen>
  );
}
