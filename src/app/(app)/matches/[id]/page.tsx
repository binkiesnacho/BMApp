import Link from "next/link";
import { notFound } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile, isStaff } from "@/lib/auth";
import { deleteMatchAction } from "../actions";
import type { Match, Player, StatEvent } from "@/lib/types/database";
import { EVENT_LABELS } from "@/lib/events";

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
