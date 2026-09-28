"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveGameStore } from "@/lib/store/liveGameStore";
import {
  EVENT_LABELS,
  SHOT_DISTANCES,
  SANCTION_OPTIONS,
  distanceLabel,
} from "@/lib/events";
import GoalZonePicker from "@/components/match/GoalZonePicker";
import { isShotEvent } from "@/lib/types/database";
import { saveLiveMatchAction } from "../../actions";
import type {
  GoalZone,
  Match,
  Player,
  ShotDistance,
  StatEventType,
} from "@/lib/types/database";

// Slot del grid de eventos: un tipo real o el meta-botón "sancion".
type EventSlot = StatEventType | "sancion";
const SHOT_ROW: StatEventType[] = ["goal", "miss", "goal_conceded", "save"];
const ACTION_ROW: EventSlot[] = ["sancion", "turnover", "double", "steps"];

function clock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function LiveMatch({
  match,
  players,
  squadIds,
}: {
  match: Match;
  players: Player[];
  squadIds: string[];
}) {
  const router = useRouter();
  const store = useLiveGameStore();
  // Flujo: 1) evento → 2) jugador → (tiro) 3) zona → 4) distancia · (sanción) 3) tipo.
  const [armed, setArmed] = useState<EventSlot | null>(null);
  const [picked, setPicked] = useState(false); // jugador ya elegido (paso con subpaso)
  const [pickedPlayer, setPickedPlayer] = useState<string | null>(null);
  const [zone, setZone] = useState<GoalZone | null>(null);
  const [showAll, setShowAll] = useState(squadIds.length === 0);
  const [timeoutActive, setTimeoutActive] = useState(false);
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

  // Partes: 1ª (0→halfLength), descanso, 2ª (halfLength→2·halfLength), final.
  const periodEndSec = store.period === 1 ? store.halfLength : store.halfLength * 2;
  const halfOver = store.elapsed >= periodEndSec;
  const firstHalfDone = store.period === 1 && halfOver; // descanso
  const matchOver = store.period === 2 && halfOver; // final
  const periodLabel = matchOver
    ? "Final"
    : firstHalfDone
      ? "Descanso"
      : store.period === 1
        ? "1ª parte"
        : "2ª parte";
  const halfMin = Math.round(store.halfLength / 60);

  const squad = useMemo(() => new Set(squadIds), [squadIds]);
  const shown = useMemo(
    () => (showAll ? players : players.filter((p) => squad.has(p.id))),
    [players, showAll, squad]
  );

  const playerLabel = (pid: string | null) => {
    if (pid === null) return "Equipo";
    const p = players.find((x) => x.id === pid);
    return p ? `${p.number ?? ""} ${p.name}`.trim() : "?";
  };

  const isShot = armed !== null && armed !== "sancion" && isShotEvent(armed);
  const isSancion = armed === "sancion";
  const needsSub = isShot || isSancion; // requiere subpaso tras elegir jugador
  const armedLabel =
    armed === null ? "" : armed === "sancion" ? "Sanción" : EVENT_LABELS[armed].label;

  function reset() {
    setArmed(null);
    setPicked(false);
    setPickedPlayer(null);
    setZone(null);
  }

  function commit(
    playerId: string | null,
    type: StatEventType,
    z: GoalZone | null,
    dist: ShotDistance | null
  ) {
    store.addEvent(playerId, type, z, dist);
    reset();
  }

  // Paso 2: al elegir jugador, los eventos simples se registran ya; los tiros y
  // las sanciones avanzan a su subpaso (zona/distancia o tipo de sanción).
  function choosePlayer(playerId: string | null) {
    if (!armed) return;
    if (needsSub) {
      setPickedPlayer(playerId);
      setPicked(true);
    } else {
      commit(playerId, armed as StatEventType, null, null);
    }
  }

  function timeout() {
    // Estado fresco del reloj (evita leer un valor obsoleto del render).
    const running = useLiveGameStore.getState().isRunning;
    if (timeoutActive) {
      // Reanudar: se vuelve a poner en marcha el reloj de juego.
      if (!running) store.toggleClock();
      setTimeoutActive(false);
    } else {
      // Tiempo muerto: registra el minuto y para el reloj de juego.
      store.addEvent(null, "timeout", null, null);
      if (running) store.toggleClock();
      setTimeoutActive(true);
    }
  }

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
        goalZone: e.goalZone,
        distance: e.distance,
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
  // El grid de jugadores está activo si hay evento y aún no se pasó al subpaso.
  const pickingPlayer = armed !== null && !(needsSub && picked);

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
            <p className="text-[10px] font-semibold uppercase tracking-wide text-label-2">
              {periodLabel}
            </p>
            <p className="font-mono text-lg text-label">{clock(store.elapsed)}</p>
            {firstHalfDone ? (
              <button
                onClick={() => {
                  store.startSecondHalf();
                  setTimeoutActive(false);
                }}
                className="mt-1 rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white"
              >
                2ª parte ▶
              </button>
            ) : matchOver ? (
              <p className="mt-1 rounded-lg bg-surface-2 px-3 py-1 text-xs font-semibold text-label-2">
                Fin del tiempo
              </p>
            ) : (
              <button
                onClick={() => {
                  store.toggleClock();
                  setTimeoutActive(false);
                }}
                className={`mt-1 rounded-lg px-3 py-1 text-xs font-semibold ${
                  store.isRunning ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"
                }`}
              >
                {store.isRunning ? "Pausar" : "Iniciar"}
              </button>
            )}
          </div>
          <div className="text-center">
            <p className="max-w-20 truncate text-[10px] text-label-2">{match.opponent}</p>
            <p className="font-mono text-3xl font-bold text-label">{store.oppScore}</p>
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

        {/* Minutos por parte (25–30 según categoría; final = 2 partes) */}
        <div className="mt-2 flex items-center justify-center gap-2 text-[11px]">
          <span className="text-label-3">Min/parte</span>
          {[20, 25, 30].map((m) => {
            const on = halfMin === m;
            return (
              <button
                key={m}
                onClick={() => store.setHalfMinutes(m)}
                aria-pressed={on}
                className={`rounded-full px-2.5 py-0.5 font-semibold transition ${
                  on ? "bg-brand text-white" : "bg-surface-2 text-label-2"
                }`}
              >
                {m}&apos;
              </button>
            );
          })}
          <span className="text-label-3">· final {halfMin * 2}&apos;</span>
        </div>
      </div>

      {/* 1 · Evento (2 filas de 4: tiros arriba; sanción/pérdida/dobles/pasos abajo) */}
      <p className="mt-4 mb-2 text-xs font-semibold text-label-2">1 · Elige evento</p>
      <div className="grid grid-cols-4 gap-2">
        {[...SHOT_ROW, ...ACTION_ROW].map((slot) => {
          const info =
            slot === "sancion"
              ? { icon: "🟨", short: "Sanción" }
              : EVENT_LABELS[slot];
          const active = armed === slot;
          return (
            <button
              key={slot}
              onClick={() => {
                reset();
                if (!active) setArmed(slot);
              }}
              aria-pressed={active}
              className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[11px] transition active:scale-95 ${
                active
                  ? "border-brand bg-brand/20 text-white"
                  : "border-separator bg-surface text-label"
              }`}
            >
              <span className="text-lg">{info.icon}</span>
              {info.short}
            </button>
          );
        })}
      </div>

      {/* Tiempo muerto: para el reloj; vuelve a pulsar para reanudar el juego */}
      <button
        onClick={timeout}
        className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-[13px] font-semibold transition active:scale-[0.99] ${
          timeoutActive
            ? "border-amber-500 bg-amber-500/15 text-amber-300"
            : "border-separator bg-surface text-label active:border-brand"
        }`}
      >
        <span className="text-base">⏱️</span>
        {timeoutActive ? "Reanudar juego" : "Tiempo muerto"}
        <span className={timeoutActive ? "text-amber-300/80" : "text-label-3"}>
          ({clock(store.elapsed)})
        </span>
      </button>

      {/* 2 · Jugador */}
      {pickingPlayer && (
        <>
          <div className="mt-4 mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-label-2">
              2 · Elige jugador <span className="text-label-3">({armedLabel})</span>
            </p>
            {squadIds.length > 0 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="text-[11px] font-medium text-sky-200"
              >
                {showAll ? `Solo convocados (${squadIds.length})` : "Ver plantilla"}
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => choosePlayer(null)}
              className="rounded-xl border border-separator bg-surface px-2 py-3 text-sm text-label active:scale-95 active:border-brand"
            >
              Equipo
            </button>
            {shown.map((p) => (
              <button
                key={p.id}
                onClick={() => choosePlayer(p.id)}
                className="truncate rounded-xl border border-separator bg-surface px-2 py-3 text-sm text-label active:scale-95 active:border-brand"
              >
                <span className="font-bold text-brand">{p.number ?? "–"}</span>{" "}
                {p.name.split(" ")[0]}
              </button>
            ))}
          </div>
          {shown.length === 0 && (
            <p className="mt-2 text-center text-[12px] text-label-3">
              No hay convocados guardados. Pulsa &quot;Ver plantilla&quot;.
            </p>
          )}
        </>
      )}

      {/* 3 · Zona de portería + 4 · Distancia (solo tiros, tras elegir jugador) */}
      {isShot && picked && (
        <>
          <div className="mt-4 mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-label-2">
              3 · ¿Por dónde?{" "}
              <span className="text-label-3">
                ({armedLabel} · {playerLabel(pickedPlayer)})
              </span>
            </p>
            <button onClick={reset} className="text-[11px] font-medium text-label-3">
              Cancelar
            </button>
          </div>
          <GoalZonePicker value={zone} onChange={setZone} />

          <p className="mt-4 mb-2 text-xs font-semibold text-label-2">
            4 · Distancia <span className="text-brand">→ registra</span>
          </p>
          <div className="grid grid-cols-4 gap-2">
            {SHOT_DISTANCES.map((d) => (
              <button
                key={d.value}
                onClick={() => commit(pickedPlayer, armed as StatEventType, zone, d.value)}
                className="rounded-xl border border-separator bg-surface px-1 py-3 text-[12px] font-semibold text-label active:scale-95 active:border-brand"
              >
                {d.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => commit(pickedPlayer, armed as StatEventType, zone, null)}
            className="mt-2 w-full rounded-xl border border-dashed border-separator py-2.5 text-[13px] font-medium text-label-2 active:scale-[0.99]"
          >
            Registrar sin distancia
          </button>
        </>
      )}

      {/* 3 · Tipo de sanción (tras elegir jugador), como el subpaso de la zona */}
      {isSancion && picked && (
        <>
          <div className="mt-4 mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-label-2">
              3 · Tipo de sanción{" "}
              <span className="text-brand">→ registra</span>{" "}
              <span className="text-label-3">({playerLabel(pickedPlayer)})</span>
            </p>
            <button onClick={reset} className="text-[11px] font-medium text-label-3">
              Cancelar
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SANCTION_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => commit(pickedPlayer, s.value, null, null)}
                className="flex flex-col items-center gap-1 rounded-xl border border-separator bg-surface py-3 text-[12px] font-semibold text-label active:scale-95 active:border-brand"
              >
                <span className="text-lg">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Eventos recientes */}
      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs font-semibold text-label-2">Últimos ({store.events.length})</p>
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
            {e.goalZone && (
              <span className="rounded bg-surface-2 px-1.5 font-mono text-[10px] text-label-2">
                Z{e.goalZone}
              </span>
            )}
            {e.distance && (
              <span className="rounded bg-surface-2 px-1.5 text-[10px] text-label-2">
                {distanceLabel(e.distance)}
              </span>
            )}
            {e.eventType !== "timeout" && (
              <span className="ml-auto truncate text-label-2">{playerLabel(e.playerId)}</span>
            )}
          </li>
        ))}
      </ul>

      {/* Guardar */}
      {msg && <p className="mt-3 text-center text-sm text-emerald-400">{msg}</p>}
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
          className="btn btn-primary flex-1 py-3.5"
        >
          {saving ? "Guardando…" : "Guardar y finalizar"}
        </button>
      </div>
    </div>
  );
}
