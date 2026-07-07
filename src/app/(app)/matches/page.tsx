import Link from "next/link";
import Screen from "@/components/ui/Screen";
import { ListGroup, ListRow } from "@/components/ui/List";
import { EmptyState } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { getMyTeams, getSessionProfile, isStaff } from "@/lib/auth";
import MatchesTabs from "./MatchesTabs";
import MatchTeamFilter from "./MatchTeamFilter";
import type { Match, Team } from "@/lib/types/database";

export const metadata = { title: "Calendario" };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; team?: string }>;
}) {
  const { tab, team: teamParam } = await searchParams;
  const [{ profile }, myTeams] = await Promise.all([
    getSessionProfile(),
    getMyTeams(),
  ]);
  const staff = isStaff(profile);
  const supabase = await createClient();

  const [{ data: allTeams }, { data: matches }] = await Promise.all([
    supabase.from("teams").select("id, name").returns<Pick<Team, "id" | "name">[]>(),
    supabase.from("matches").select("*").returns<Match[]>(),
  ]);

  const teamName = (tid: string) =>
    (allTeams ?? []).find((t) => t.id === tid)?.name ?? "Equipo";

  // Equipo seleccionado: por defecto mi primer equipo; "all" = todo el club.
  const teamValue = teamParam ?? myTeams[0]?.id ?? "all";

  const scoped =
    teamValue === "all"
      ? matches ?? []
      : (matches ?? []).filter((m) => m.team_id === teamValue);

  const upcoming = scoped
    .filter((m) => m.status !== "finished")
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const results = scoped
    .filter((m) => m.status === "finished")
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  const active: "proximos" | "resultados" =
    tab === "resultados" || tab === "proximos"
      ? tab
      : upcoming.length > 0
        ? "proximos"
        : "resultados";
  const list = active === "proximos" ? upcoming : results;
  const showTeamLabel = teamValue === "all";

  return (
    <Screen
      title="Calendario"
      subtitle={
        teamValue === "all" ? "Todos los equipos" : teamName(teamValue)
      }
      trailing={staff ? <Link href="/matches/new">Nuevo</Link> : undefined}
    >
      <MatchTeamFilter teams={myTeams} value={teamValue} tab={active} showAll />

      <MatchesTabs value={active} team={teamValue} />

      <div className="mt-4">
        {list.length === 0 ? (
          <EmptyState icon={active === "proximos" ? "📅" : "🏆"}>
            {active === "proximos"
              ? "No hay partidos próximos."
              : "Todavía no hay resultados."}
          </EmptyState>
        ) : (
          <ListGroup>
            {list.map((m) => {
              const live = m.status === "live";
              const win = m.our_score > m.opp_score;
              const draw = m.our_score === m.opp_score;
              return (
                <ListRow
                  key={m.id}
                  href={`/matches/${m.id}`}
                  title={`vs ${m.opponent}`}
                  subtitle={
                    showTeamLabel
                      ? `${teamName(m.team_id)} · ${fmtDate(m.date)}`
                      : fmtDate(m.date)
                  }
                  value={
                    active === "proximos" ? (
                      live ? (
                        <span className="rounded-full bg-negative px-2 py-0.5 text-[10px] font-bold text-white">
                          EN VIVO
                        </span>
                      ) : (
                        <span className="text-[13px] text-label-2">
                          {new Date(m.date).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )
                    ) : (
                      <span
                        className={`font-mono text-[15px] font-semibold ${
                          win ? "text-positive" : draw ? "text-label-2" : "text-negative"
                        }`}
                      >
                        {m.our_score}–{m.opp_score}
                      </span>
                    )
                  }
                />
              );
            })}
          </ListGroup>
        )}
      </div>
    </Screen>
  );
}
