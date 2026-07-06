import Link from "next/link";
import Screen from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { getMyTeams, getSessionProfile } from "@/lib/auth";
import { EVENT_LABELS } from "@/lib/events";
import { aggregateByPlayer, shootingAccuracy } from "@/lib/stats";
import StatsFilters from "./StatsFilters";
import type { Match, Player, StatEvent, StatEventType, Team } from "@/lib/types/database";

export const metadata = { title: "Estadísticas" };

const COLS: StatEventType[] = [
  "goal",
  "assist",
  "save",
  "miss",
  "turnover",
  "exclusion_2min",
];

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; match?: string }>;
}) {
  const { team: teamParam, match: matchId } = await searchParams;
  const supabase = await createClient();
  const [{ profile }, myTeams] = await Promise.all([
    getSessionProfile(),
    getMyTeams(),
  ]);

  const [{ data: players }, { data: allTeams }, { data: matches }] =
    await Promise.all([
      supabase.from("players").select("*").returns<Player[]>(),
      supabase
        .from("teams")
        .select("*")
        .order("name", { ascending: true })
        .returns<Team[]>(),
      supabase
        .from("matches")
        .select("*")
        .neq("status", "scheduled")
        .order("date", { ascending: false })
        .returns<Match[]>(),
    ]);

  // Equipo seleccionado: por defecto el del usuario; 'all' = todo el club.
  const defaultTeam = myTeams[0]?.id ?? "all";
  const teamValue = teamParam ?? defaultTeam;
  // Opciones del selector: mis equipos primero, luego el resto del club.
  const teamOptions: Team[] = [
    ...myTeams,
    ...(allTeams ?? []).filter((t) => !myTeams.some((mt) => mt.id === t.id)),
  ];

  // Partidos del equipo seleccionado (para el filtro y para acotar eventos).
  const teamMatches =
    teamValue === "all"
      ? matches ?? []
      : (matches ?? []).filter((m) => m.team_id === teamValue);
  const matchIds = new Set(teamMatches.map((m) => m.id));

  // Eventos: por partido concreto, o por equipo, o todo el club.
  const { data: allEvents } = await supabase
    .from("stats_events")
    .select("*")
    .returns<StatEvent[]>();
  const events = (allEvents ?? []).filter((e) => {
    if (matchId) return e.match_id === matchId;
    if (teamValue !== "all") return matchIds.has(e.match_id);
    return true;
  });

  const myPlayerIds = new Set(
    (players ?? []).filter((p) => p.profile_id === profile?.id).map((p) => p.id)
  );

  const counts = aggregateByPlayer(events);
  const rows = (players ?? [])
    .map((p) => ({ player: p, c: counts.get(p.id) ?? {} }))
    .filter((r) => Object.keys(r.c).length > 0)
    .sort((a, b) => (b.c.goal ?? 0) - (a.c.goal ?? 0));

  const teamSubtitle =
    teamValue === "all"
      ? "Todo el club"
      : teamOptions.find((t) => t.id === teamValue)?.name;

  return (
    <Screen title="Estadísticas" subtitle={teamSubtitle}>
      <StatsFilters
        teams={teamOptions}
        teamValue={teamValue}
        matches={teamMatches}
        matchValue={matchId ?? ""}
      />

      <div className="mt-4">
        {rows.length === 0 ? (
          <EmptyState icon="📊">
            Sin estadísticas para esta selección. Registra un partido en vivo
            para verlas aquí.
          </EmptyState>
        ) : (
          <div className="no-scrollbar overflow-x-auto rounded-2xl bg-surface">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-label-3">
                  <th className="sticky left-0 bg-surface px-3 py-2.5 text-left font-medium">
                    Jugador
                  </th>
                  {COLS.map((c) => (
                    <th
                      key={c}
                      className="px-2 py-2.5 text-center font-medium"
                      title={EVENT_LABELS[c].label}
                    >
                      {EVENT_LABELS[c].icon}
                    </th>
                  ))}
                  <th className="px-2 py-2.5 text-center font-medium" title="% acierto">
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ player, c }) => {
                  const acc = shootingAccuracy(c);
                  const mine = myPlayerIds.has(player.id);
                  return (
                    <tr
                      key={player.id}
                      className={`border-t border-separator/50 ${mine ? "bg-brand/10" : ""}`}
                    >
                      <td
                        className={`sticky left-0 px-3 py-2.5 text-label ${
                          mine ? "bg-[#132a3f]" : "bg-surface"
                        }`}
                      >
                        <Link href={`/players/${player.id}`} className="tap">
                          <span className="font-semibold text-brand">
                            {player.number ?? "–"}
                          </span>{" "}
                          {player.name}
                          {mine && " · tú"}
                        </Link>
                      </td>
                      {COLS.map((col) => (
                        <td key={col} className="px-2 py-2.5 text-center text-label-2">
                          {c[col] ?? 0}
                        </td>
                      ))}
                      <td className="px-2 py-2.5 text-center font-semibold text-label">
                        {acc === null ? "–" : `${acc}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-3 px-1 text-[12px] text-label-3">
        % = acierto en tiro (goles ÷ goles+fallos). Desliza para ver más
        columnas.
      </p>
    </Screen>
  );
}
