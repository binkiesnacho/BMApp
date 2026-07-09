import { notFound } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { TileGrid, Tile } from "@/components/ui/Tile";
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
      <TileGrid>
        <Tile
          href={`/teams/${team.id}`}
          title="Plantilla"
          subtitle="Jugadores del equipo"
          icon="👥"
        />
        <Tile
          href={`/stats?team=${team.id}`}
          title="Estadísticas"
          subtitle="Por jugador"
          icon="📊"
        />
        <Tile
          href={`/standings?team=${team.id}`}
          title="Clasificación"
          subtitle="Tabla de la liga"
          icon="🏆"
        />
        <Tile
          href={`/matches?team=${team.id}`}
          title="Partidos"
          subtitle="Calendario y resultados"
          icon="🤾"
        />
        <Tile
          href="/trainings"
          title="Entrenamientos"
          subtitle="Sesiones y asistencia"
          icon="🏋️"
        />
        {ficha && (
          <Tile
            href={`/players/${ficha.id}`}
            title="Mi ficha"
            subtitle="Tus estadísticas y faltas"
            icon="⭐"
          />
        )}
      </TileGrid>
    </Screen>
  );
}
