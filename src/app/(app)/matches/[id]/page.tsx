import Link from "next/link";
import { notFound } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { createClient } from "@/lib/supabase/server";
import { canCapture, canManageTeam, getSessionProfile } from "@/lib/auth";
import { loadObservations } from "@/lib/observations";
import ObservationsSection from "../../observations/ObservationsSection";
import type {
  Match,
  Player,
  StatEvent,
  StatEventType,
  Team,
} from "@/lib/types/database";
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
  const capture = canCapture(profile);

  const supabase = await createClient();

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .maybeSingle<Match>();
  if (!match) notFound();

  const [{ data: team }, { data: players }, { data: events }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, coach_id")
      .eq("id", match.team_id)
      .maybeSingle<Pick<Team, "id" | "coach_id">>(),
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

  const canManage = canManageTeam(profile, team ?? null);
  const observations = canManage
    ? await loadObservations(supabase, { matchId: id })
    : [];

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
    <Screen
      title={`vs ${match.opponent}`}
      subtitle={fmtDate(match.date)}
      back="/matches"
      trailing={
        canManage ? (
          <Link href={`/matches/${match.id}/edit`}>Editar</Link>
        ) : undefined
      }
    >
      {/* Marcador */}
      <div className="rounded-2xl bg-surface p-5 text-center">
        {match.status === "scheduled" ? (
          <p className="text-sm text-label-2">Aún no comenzado</p>
        ) : (
          <div className="flex items-center justify-center gap-4">
            <div className="flex-1 text-right">
              <p className="text-xs text-label-2">Nosotros</p>
              <p className="font-mono text-4xl font-bold text-brand">
                {match.our_score}
              </p>
            </div>
            <span className="text-2xl text-label-3">–</span>
            <div className="flex-1 text-left">
              <p className="text-xs text-label-2">{match.opponent}</p>
              <p className="font-mono text-4xl font-bold text-label">
                {match.opp_score}
              </p>
            </div>
          </div>
        )}
        {match.location && (
          <p className="mt-2 text-xs text-label-3">📍 {match.location}</p>
        )}
      </div>

      {/* Captura en vivo (staff + técnico). Editar datos y eliminar viven en /edit. */}
      {capture && (
        <div className="mt-3">
          <Link
            href={`/matches/${match.id}/live`}
            className="block rounded-xl bg-brand px-4 py-3 text-center text-sm font-semibold text-white"
          >
            {finished
              ? "Revisar / editar en vivo"
              : match.status === "live"
                ? "▶ Continuar en vivo"
                : "▶ Iniciar en vivo"}
          </Link>
        </div>
      )}

      {/* Observaciones (privadas del cuerpo técnico; ligables a un jugador) */}
      <ObservationsSection
        observations={observations}
        canManage={canManage}
        ctx={{
          teamId: match.team_id,
          sourceType: "match",
          matchId: match.id,
          occurredAt: match.date,
        }}
        players={(players ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          number: p.number,
        }))}
        showPlayer
        linkPlayer
      />

      {/* Estadísticas por jugador del partido */}
      {statRows.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 text-sm font-semibold text-label">
            Estadísticas del partido
          </h2>
          <div className="overflow-x-auto no-scrollbar rounded-2xl border border-separator/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface text-label-2">
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
                    <tr key={player.id} className="border-t border-separator/60">
                      <td className="px-3 py-2 text-label">
                        <span className="font-bold text-brand">
                          {player.number ?? "–"}
                        </span>{" "}
                        {player.name}
                      </td>
                      {STAT_COLS.map((col) => (
                        <td
                          key={col}
                          className="px-2 py-2 text-center text-label"
                        >
                          {c[col] ?? 0}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center font-semibold text-label">
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
      <h2 className="mt-6 mb-2 text-sm font-semibold text-label">
        Eventos ({events?.length ?? 0})
      </h2>
      <ul className="space-y-1.5">
        {events?.map((e) => {
          const info = EVENT_LABELS[e.event_type];
          const mm = Math.floor((e.game_second ?? 0) / 60);
          return (
            <li
              key={e.id}
              className="flex items-center gap-2 rounded-xl border border-separator/60 bg-surface px-3 py-2 text-sm"
            >
              <span className="w-8 shrink-0 font-mono text-xs text-label-3">
                {mm}
                {"'"}
              </span>
              <span>{info?.icon}</span>
              <span className="text-label">{info?.label}</span>
              <span className="ml-auto truncate text-label-2">
                {playerName(e.player_id)}
              </span>
            </li>
          );
        })}
      </ul>
      {(!events || events.length === 0) && (
        <p className="rounded-xl border border-dashed border-separator/70 p-6 text-center text-[13px] text-label-3">
          Sin eventos registrados.
        </p>
      )}
    </Screen>
  );
}
