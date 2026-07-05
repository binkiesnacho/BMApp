"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveGameStore } from "@/lib/store/liveGameStore";
import { EVENT_ORDER, EVENT_LABELS } from "@/lib/events";
import { saveLiveMatchAction } from "../../actions";
import type { Match, Player } from "@/lib/types/database";

function clock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function LiveMatch({
  match,
  players,
}: {
  match: Match;
  players: Player[];
}) {
  const router = useRouter();
  const store = useLiveGameStore();
  const [selected, setSelected] = useState<string | null>(null); // playerId | null (Equipo)
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Inicializa la sesión solo si es un partido distinto al que hay en memoria.
  useEffect(() => {
    if (store.matchId !== match.id) {
      store.startMatch(match.id, match.opp_score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id]);

  // Reloj de partido.
  useEffect(() => {
    if (!store.isRunning) return;
    const t = setInterval(() => store.tick(), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.isRunning]);

  const ourScore = useMemo(
    () => store.events.filter((e) => e.eventType === "goal").length,
    [store.events]
  );

  const playerLabel = (pid: string | null) => {
    if (pid === null) return "Equipo";
    const p = players.find((x) => x.id === pid);
    return p ? `${p.number ?? ""} ${p.name}`.trim() : "?";
  };

  async function save(finish: boolean) {
    setSaving(true);
    setMsg(null);
    const res = await saveLiveMatchAction({
      matchId: match.id,
      ourScore,
      oppScore: store.oppScore,
      finish,
      events: store.events.map((e) => ({
        playerId: e.playerId,
        eventType: e.eventType,
        gameSecond: e.gameSecond,
      })),
    });
    setSaving(false);
    if (res.error) {
      setMsg(res.error);
      return;
    }
    if (finish) {
      store.reset();
      router.push(`/matches/${match.id}`);
      router.refresh();
    } else {
      setMsg("Guardado ✓");
    }
  }

  const recent = [...store.events].slice(-6).reverse();

  return (
    <div className="px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {/* Marcador + reloj */}
      <div className="safe-top sticky top-0 z-20 -mx-4 border-b border-separator/60 bg-canvas/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="text-center">
            <p className="text-[10px] text-label-2">Nosotros</p>
            <p className="font-mono text-3xl font-bold text-brand">{ourScore}</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-lg text-label">{clock(store.elapsed)}</p>
            <button
              onClick={() => store.toggleClock()}
              className={`mt-1 rounded-lg px-3 py-1 text-xs font-semibold ${
                store.isRunning
                  ? "bg-amber-600 text-white"
                  : "bg-emerald-600 text-white"
              }`}
            >
              {store.isRunning ? "Pausar" : "Iniciar"}
            </button>
          </div>
          <div className="text-center">
            <p className="max-w-20 truncate text-[10px] text-label-2">
              {match.opponent}
            </p>
            <p className="font-mono text-3xl font-bold text-label">
              {store.oppScore}
            </p>
            <div className="mt-1 flex gap-1">
              <button
                onClick={() => store.setOppScore(store.oppScore - 1)}
                className="h-6 w-6 rounded bg-surface-2 text-label"
              >
                −
              </button>
              <button
                onClick={() => store.setOppScore(store.oppScore + 1)}
                className="h-6 w-6 rounded bg-surface-2 text-label"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Selección de jugador */}
      <p className="mt-4 mb-2 text-xs font-semibold text-label-2">
        1 · Elige jugador
      </p>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setSelected(null)}
          className={`rounded-xl border px-2 py-2 text-sm ${
            selected === null
              ? "border-brand bg-brand/20 text-white"
              : "border-separator bg-surface text-label"
          }`}
        >
          Equipo
        </button>
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`truncate rounded-xl border px-2 py-2 text-sm ${
              selected === p.id
                ? "border-brand bg-brand/20 text-white"
                : "border-separator bg-surface text-label"
            }`}
          >
            <span className="font-bold text-brand">{p.number ?? "–"}</span>{" "}
            {p.name.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* Botones de evento */}
      <p className="mt-4 mb-2 text-xs font-semibold text-label-2">
        2 · Registra evento{" "}
        <span className="text-label-3">({playerLabel(selected)})</span>
      </p>
      <div className="grid grid-cols-4 gap-2">
        {EVENT_ORDER.map((type) => {
          const info = EVENT_LABELS[type];
          return (
            <button
              key={type}
              onClick={() => store.addEvent(selected, type)}
              className="flex flex-col items-center gap-1 rounded-xl border border-separator bg-surface py-2.5 text-[11px] text-label active:scale-95 active:border-brand"
            >
              <span className="text-lg">{info.icon}</span>
              {info.short}
            </button>
          );
        })}
      </div>

      {/* Eventos recientes */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs font-semibold text-label-2">
          Últimos ({store.events.length})
        </p>
        <button
          onClick={() => store.undoLast()}
          disabled={store.events.length === 0}
          className="rounded-lg border border-separator px-2 py-1 text-xs text-label disabled:opacity-40"
        >
          ↶ Deshacer
        </button>
      </div>
      <ul className="mt-2 space-y-1">
        {recent.map((e) => (
          <li
            key={e.tempId}
            className="flex items-center gap-2 rounded-lg bg-surface px-3 py-1.5 text-xs"
          >
            <span className="w-8 font-mono text-label-3">
              {Math.floor(e.gameSecond / 60)}
              {"'"}
            </span>
            <span>{EVENT_LABELS[e.eventType].icon}</span>
            <span className="text-label">{EVENT_LABELS[e.eventType].label}</span>
            <span className="ml-auto truncate text-label-2">
              {playerLabel(e.playerId)}
            </span>
          </li>
        ))}
      </ul>

      {/* Guardar */}
      {msg && (
        <p className="mt-3 text-center text-sm text-emerald-400">{msg}</p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => save(false)}
          disabled={saving}
          className="flex-1 rounded-xl border border-separator px-4 py-3 text-sm font-semibold text-label disabled:opacity-50"
        >
          Guardar
        </button>
        <button
          onClick={() => save(true)}
          disabled={saving}
          className="flex-1 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar y finalizar"}
        </button>
      </div>
    </div>
  );
}
