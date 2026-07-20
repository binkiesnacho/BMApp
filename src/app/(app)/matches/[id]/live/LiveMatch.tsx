"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveGameStore } from "@/lib/store/liveGameStore";
import { EVENT_ORDER, EVENT_LABELS, SHOT_DISTANCES, distanceLabel } from "@/lib/events";
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
  // Flujo: 1) evento → 2) jugador → (si es tiro) 3) zona → 4) distancia (registra).
  const [armed, setArmed] = useState<StatEventType | null>(null);
  const [picked, setPicked] = useState(false); // jugador ya elegido (flujo de tiro)
  const [pickedPlayer, setPickedPlayer] = useState<string | null>(null);
  const [zone, setZone] = useState<GoalZone | null>(null);
  const [showAll, setShowAll] = useState(squadIds.length === 0);
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

  const isShot = armed !== null && isShotEvent(armed);

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

  // Paso 2: al elegir jugador, los eventos que no son tiro se registran ya;
  // los tiros avanzan a zona + distancia.
  function choosePlayer(playerId: string | null) {
    if (!armed) return;
    if (isShot) {
      setPickedPlayer(playerId);
      setPicked(true);
    } else {
      commit(playerId, armed, null, null);
    }
  }

  function timeout() {
    // Tiempo muerto: evento de equipo, registra el minuto actual.
    store.addEvent(null, "timeout", null, null);
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
  // El grid de jugadores está activo si hay evento y aún no se pasó a zona (tiro).
  const pickingPlayer = armed !== null && !(isShot && picked);

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
                store.isRunning ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"
              }`}
            >
              {store.isRunning ? "Pausar" : "Iniciar"}
            </button>
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
      </div>

      {/* 1 · Evento */}
      <p className="mt-4 mb-2 text-xs font-semibold text-label-2">1 · Elige evento</p>
      <div className="grid grid-cols-4 gap-2">
        {EVENT_ORDER.map((type) => {
          const info = EVENT_LABELS[type];
          const active = armed === type;
          return (
            <button
              key={type}
              onClick={() => {
                reset();
                if (!active) setArmed(type);
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

      {/* Tiempo muerto: registra el minuto al instante */}
      <button
        onClick={timeout}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-separator bg-surface py-2.5 text-[13px] font-semibold text-label active:scale-[0.99] active:border-brand"
      >
        <span className="text-base">⏱️</span> Tiempo muerto
        <span className="text-label-3">({clock(store.elapsed)})</span>
      </button>

      {/* 2 · Jugador */}
      {pickingPlayer && (
        <>
          <div className="mt-4 mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-label-2">
              2 · Elige jugador{" "}
              <span className="text-label-3">({EVENT_LABELS[armed].label})</span>
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
                ({EVENT_LABELS[armed].label} · {playerLabel(pickedPlayer)})
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
                onClick={() => commit(pickedPlayer, armed, zone, d.value)}
                className="rounded-xl border border-separator bg-surface px-1 py-3 text-[12px] font-semibold text-label active:scale-95 active:border-brand"
              >
                {d.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => commit(pickedPlayer, armed, zone, null)}
            className="mt-2 w-full rounded-xl border border-dashed border-separator py-2.5 text-[13px] font-medium text-label-2 active:scale-[0.99]"
          >
            Registrar sin distancia
          </button>
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
