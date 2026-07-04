import AppHeader from "@/components/layout/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { EVENT_LABELS } from "@/lib/events";
import type { Player, StatEvent, StatEventType } from "@/lib/types/database";

export const metadata = { title: "Estadísticas" };

const COLS: StatEventType[] = [
  "goal",
  "assist",
  "save",
  "miss",
  "turnover",
  "exclusion_2min",
];

export default async function StatsPage() {
  const supabase = await createClient();

  const [{ data: players }, { data: events }] = await Promise.all([
    supabase.from("players").select("*").returns<Player[]>(),
    supabase.from("stats_events").select("*").returns<StatEvent[]>(),
  ]);

  // Agrega recuentos por jugador y tipo de evento.
  const counts = new Map<string, Record<string, number>>();
  for (const e of events ?? []) {
    if (!e.player_id) continue;
    const row = counts.get(e.player_id) ?? {};
    row[e.event_type] = (row[e.event_type] ?? 0) + 1;
    counts.set(e.player_id, row);
  }

  const rows = (players ?? [])
    .map((p) => ({ player: p, c: counts.get(p.id) ?? {} }))
    .filter((r) => Object.keys(r.c).length > 0)
    .sort((a, b) => (b.c.goal ?? 0) - (a.c.goal ?? 0));

  return (
    <>
      <AppHeader title="Estadísticas" subtitle="Acumulado por jugador" />

      {rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-400">
          Aún no hay estadísticas. Registra un partido en vivo para verlas aquí.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto no-scrollbar rounded-2xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900 text-slate-400">
                <th className="px-3 py-2 text-left font-medium">Jugador</th>
                {COLS.map((c) => (
                  <th
                    key={c}
                    className="px-2 py-2 text-center font-medium"
                    title={EVENT_LABELS[c].label}
                  >
                    {EVENT_LABELS[c].icon}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ player, c }) => (
                <tr key={player.id} className="border-t border-slate-800">
                  <td className="px-3 py-2 text-slate-100">
                    <span className="font-bold text-brand">
                      {player.number ?? "–"}
                    </span>{" "}
                    {player.name}
                  </td>
                  {COLS.map((col) => (
                    <td
                      key={col}
                      className="px-2 py-2 text-center text-slate-300"
                    >
                      {c[col] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
