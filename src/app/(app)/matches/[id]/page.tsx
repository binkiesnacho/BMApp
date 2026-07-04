import Link from "next/link";
import { notFound } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile, isStaff } from "@/lib/auth";
import { deleteMatchAction } from "../actions";
import type { Match, Player, StatEvent, StatEventType } from "@/lib/types/database";
import { EVENT_LABELS } from "@/lib/events";
import { aggregateByPlayer, shootingAccuracy } from "@/lib/stats";

const STAT_COLS: StatEventType[] = [
  "goal",
  "assist",
  "save",
  "miss",
  "turnover",
  "exclusion_2min",
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await getSessionProfile();
  const staff = isStaff(profile);

  const supabase = await createClient();

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .maybeSingle<Match>();
  if (!match) notFound();

  const [{ data: players }, { data: events }] = await Promise.all([
    supabase
      .from("players")
      .select("*")
      .eq("team_id", match.team_id)
      .returns<Player[]>(),
    supabase
      .from("stats_events")
      .select("*")
      .eq("match_id", id)
      .order("game_second", { ascending: true })
      .returns<StatEvent[]>(),
  ]);

  const playerName = (pid: string | null) =>
    players?.find((p) => p.id === pid)?.name ?? "Equipo";

  const finished = match.status === "finished";

  // Estadísticas por jugador de ESTE partido.
  const counts = aggregateByPlayer(events ?? []);
  const statRows = (players ?? [])
    .map((p) => ({ player: p, c: counts.get(p.id) ?? {} }))
    .filter((r) => Object.keys(r.c).length > 0)
    .sort((a, b) => (b.c.goal ?? 0) - (a.c.goal ?? 0));

  return (
    <>
      <AppHeader
        title={`vs ${match.opponent}`}
        subtitle={fmtDate(match.date)}
        action={
          <Link
            href="/matches"
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300"
          >
            ‹ Partidos
          </Link>
        }
      />

      {/* Marcador */}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-center">
        {match.status === "scheduled" ? (
          <p className="text-sm text-slate-400">Aún no comenzado</p>
        ) : (
          <div className="flex items-center justify-center gap-4">
            <div className="flex-1 text-right">
              <p className="text-xs text-slate-400">Nosotros</p>
              <p className="font-mono text-4xl font-bold text-brand">
                {match.our_score}
              </p>
            </div>
            <span className="text-2xl text-slate-600">–</span>
            <div className="flex-1 text-left">
              <p className="text-xs text-slate-400">{match.opponent}</p>
              <p className="font-mono text-4xl font-bold text-slate-200">
                {match.opp_score}
              </p>
            </div>
          </div>
        )}
        {match.location && (
          <p className="mt-2 text-xs text-slate-500">📍 {match.location}</p>
        )}
      </div>

      {/* Acciones de staff */}
      {staff && (
        <div className="mt-3 flex gap-2">
          <Link
            href={`/matches/${match.id}/live`}
            className="flex-1 rounded-xl bg-brand px-4 py-3 text-center text-sm font-semibold text-white"
          >
            {finished
              ? "Revisar / editar en vivo"
              : match.status === "live"
                ? "▶ Continuar en vivo"
                : "▶ Iniciar en vivo"}
          </Link>
          <form action={deleteMatchAction}>
            <input type="hidden" name="matchId" value={match.id} />
            <button className="rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-400 hover:text-red-400">
              Eliminar
            </button>
          </form>
        </div>
      )}

      {/* Estadísticas por jugador del partido */}
      {statRows.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 text-sm font-semibold text-slate-300">
            Estadísticas del partido
          </h2>
          <div className="overflow-x-auto no-scrollbar rounded-2xl border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-slate-400">
                  <th className="px-3 py-2 text-left font-medium">Jugador</th>
                  {STAT_COLS.map((c) => (
                    <th
                      key={c}
                      className="px-2 py-2 text-center font-medium"
                      title={EVENT_LABELS[c].label}
                    >
                      {EVENT_LABELS[c].icon}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center font-medium" title="% acierto">
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {statRows.map(({ player, c }) => {
                  const acc = shootingAccuracy(c);
                  return (
                    <tr key={player.id} className="border-t border-slate-800">
                      <td className="px-3 py-2 text-slate-100">
                        <span className="font-bold text-brand">
                          {player.number ?? "–"}
                        </span>{" "}
                        {player.name}
                      </td>
                      {STAT_COLS.map((col) => (
                        <td
                          key={col}
                          className="px-2 py-2 text-center text-slate-300"
                        >
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
        </>
      )}

      {/* Cronología de eventos */}
      <h2 className="mt-6 mb-2 text-sm font-semibold text-slate-300">
        Eventos ({events?.length ?? 0})
      </h2>
      <ul className="space-y-1.5">
        {events?.map((e) => {
          const info = EVENT_LABELS[e.event_type];
          const mm = Math.floor((e.game_second ?? 0) / 60);
          return (
            <li
              key={e.id}
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
            >
              <span className="w-8 shrink-0 font-mono text-xs text-slate-500">
                {mm}
                {"'"}
              </span>
              <span>{info?.icon}</span>
              <span className="text-slate-300">{info?.label}</span>
              <span className="ml-auto truncate text-slate-400">
                {playerName(e.player_id)}
              </span>
            </li>
          );
        })}
      </ul>
      {(!events || events.length === 0) && (
        <p className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
          Sin eventos registrados.
        </p>
      )}
    </>
  );
}
