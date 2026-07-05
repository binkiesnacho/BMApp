import Screen from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/Card";
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
    (players ?? []).filter((p) => p.profile_id === profile?.id).map((p) => p.id)
  );

  const counts = aggregateByPlayer(events ?? []);
  const rows = (players ?? [])
    .map((p) => ({ player: p, c: counts.get(p.id) ?? {} }))
    .filter((r) => Object.keys(r.c).length > 0)
    .sort((a, b) => (b.c.goal ?? 0) - (a.c.goal ?? 0));

  return (
    <Screen title="Estadísticas" subtitle="Acumulado por jugador">
      <MatchFilter matches={matches ?? []} current={matchId ?? ""} />

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
                        <span className="font-semibold text-brand">
                          {player.number ?? "–"}
                        </span>{" "}
                        {player.name}
                        {mine && " · tú"}
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
