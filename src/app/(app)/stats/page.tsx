import AppHeader from "@/components/layout/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { EVENT_LABELS } from "@/lib/events";
import { aggregateByPlayer, shootingAccuracy } from "@/lib/stats";
import MatchFilter from "./MatchFilter";
import type { Match, Player, StatEvent, StatEventType } from "@/lib/types/database";

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
  searchParams: Promise<{ match?: string }>;
}) {
  const { match: matchId } = await searchParams;
  const supabase = await createClient();
  const { profile } = await getSessionProfile();

  const eventsQuery = supabase.from("stats_events").select("*");
  if (matchId) eventsQuery.eq("match_id", matchId);

  const [{ data: players }, { data: events }, { data: matches }] =
    await Promise.all([
      supabase.from("players").select("*").returns<Player[]>(),
      eventsQuery.returns<StatEvent[]>(),
      supabase
        .from("matches")
        .select("*")
        .neq("status", "scheduled")
        .order("date", { ascending: false })
        .returns<Match[]>(),
    ]);

  const myPlayerIds = new Set(
    (players ?? [])
      .filter((p) => p.profile_id === profile?.id)
      .map((p) => p.id)
  );

  const counts = aggregateByPlayer(events ?? []);
  const rows = (players ?? [])
    .map((p) => ({ player: p, c: counts.get(p.id) ?? {} }))
    .filter((r) => Object.keys(r.c).length > 0)
    .sort((a, b) => (b.c.goal ?? 0) - (a.c.goal ?? 0));

  return (
    <>
      <AppHeader
        title="Estadísticas"
        subtitle={matchId ? "Partido seleccionado" : "Acumulado por jugador"}
      />

      <div className="mt-4">
        <MatchFilter matches={matches ?? []} current={matchId ?? ""} />
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-400">
          Sin estadísticas para esta selección.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto no-scrollbar rounded-2xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900 text-slate-400">
                <th className="sticky left-0 bg-slate-900 px-3 py-2 text-left font-medium">
                  Jugador
                </th>
                {COLS.map((c) => (
                  <th
                    key={c}
                    className="px-2 py-2 text-center font-medium"
                    title={EVENT_LABELS[c].label}
                  >
                    {EVENT_LABELS[c].icon}
                  </th>
                ))}
                <th className="px-2 py-2 text-center font-medium" title="% acierto en tiro">
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
                    className={`border-t border-slate-800 ${mine ? "bg-brand/10" : ""}`}
                  >
                    <td
                      className={`sticky left-0 px-3 py-2 text-slate-100 ${
                        mine ? "bg-brand/10" : "bg-slate-950"
                      }`}
                    >
                      <span className="font-bold text-brand">
                        {player.number ?? "–"}
                      </span>{" "}
                      {player.name}
                      {mine && " · tú"}
                    </td>
                    {COLS.map((col) => (
                      <td key={col} className="px-2 py-2 text-center text-slate-300">
                        {c[col] ?? 0}
                      </td>
                    ))}
                    <td className="px-2 py-2 text-center font-semibold text-slate-200">
                      {acc === null ? "–" : `${acc}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 px-1 text-xs text-slate-500">
        % = acierto en tiro (goles ÷ goles+fallos). Desliza la tabla para ver
        más columnas.
      </p>
    </>
  );
}
