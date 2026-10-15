"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { saveLineupAction } from "../actions";
import CourtLines from "@/components/court/CourtLines";
import { DEFENSE_SYSTEMS } from "@/lib/types/database";
import type { DefenseSystem, Player, TeamLineup } from "@/lib/types/database";

/** Un hueco de la pista: posición en % (x,y) sobre la pista VERTICAL y la
 *  posición sugerida para ordenar los jugadores del desplegable.
 *  Pista como en la pizarra pero en vertical: portería de arriba = ataque,
 *  portería de abajo = defensa. x = ancho (0 izq … 100 der), y = largo
 *  (0 arriba … 100 abajo). */
type Slot = {
  key: string;
  label: string;
  short: string;
  x: number;
  y: number;
  pos: string | null;
};

// Ataque: atacamos la portería de arriba. Extremos en los corners (pegados a la
// banda y cerca de la línea de gol); laterales abiertos a la banda; central y
// pivote por el centro.
const ATTACK: Slot[] = [
  { key: "PT", label: "Portero", short: "PT", x: 50, y: 5, pos: "Portero" },
  { key: "EI", label: "Extremo izq.", short: "EI", x: 7, y: 15, pos: "Extremo izquierdo" },
  { key: "ED", label: "Extremo der.", short: "ED", x: 93, y: 15, pos: "Extremo derecho" },
  { key: "PV", label: "Pivote", short: "PV", x: 50, y: 21, pos: "Pivote" },
  { key: "LI", label: "Lateral izq.", short: "LI", x: 15, y: 39, pos: "Lateral izquierdo" },
  { key: "LD", label: "Lateral der.", short: "LD", x: 85, y: 39, pos: "Lateral derecho" },
  { key: "CE", label: "Central", short: "CE", x: 50, y: 45, pos: "Central" },
];

// Defensa: defendemos la portería de abajo. Los defensores se colocan EN ARCO
// alrededor del área de 6 m (no en línea): los centrales más salidos (y menor),
// y laterales/exteriores curvándose hacia la banda y la portería (y mayor).
const DEFENSE: Record<DefenseSystem, Slot[]> = {
  "6-0": [
    { key: "D1", label: "Exterior izq.", short: "EI", x: 10, y: 87, pos: "Extremo izquierdo" },
    { key: "D2", label: "Lateral izq.", short: "LI", x: 27, y: 82, pos: "Lateral izquierdo" },
    { key: "D3", label: "Central izq.", short: "CI", x: 42, y: 78, pos: "Central" },
    { key: "D4", label: "Central der.", short: "CD", x: 58, y: 78, pos: "Central" },
    { key: "D5", label: "Lateral der.", short: "LD", x: 73, y: 82, pos: "Lateral derecho" },
    { key: "D6", label: "Exterior der.", short: "ED", x: 90, y: 87, pos: "Extremo derecho" },
    { key: "PT", label: "Portero", short: "PT", x: 50, y: 94, pos: "Portero" },
  ],
  "5-1": [
    { key: "D1", label: "Exterior izq.", short: "EI", x: 12, y: 87, pos: "Extremo izquierdo" },
    { key: "D2", label: "Lateral izq.", short: "LI", x: 31, y: 81, pos: "Lateral izquierdo" },
    { key: "D3", label: "Central", short: "CE", x: 50, y: 78, pos: "Central" },
    { key: "D4", label: "Lateral der.", short: "LD", x: 69, y: 81, pos: "Lateral derecho" },
    { key: "D5", label: "Exterior der.", short: "ED", x: 88, y: 87, pos: "Extremo derecho" },
    { key: "AV", label: "Avanzado", short: "AV", x: 50, y: 61, pos: "Central" },
    { key: "PT", label: "Portero", short: "PT", x: 50, y: 94, pos: "Portero" },
  ],
  "3-2-1": [
    // Abajo: los 3 defienden a los extremos → bien abiertos a la banda.
    { key: "D1", label: "Exterior izq.", short: "EI", x: 13, y: 86, pos: "Extremo izquierdo" },
    { key: "D2", label: "Central", short: "CE", x: 50, y: 81, pos: "Central" },
    { key: "D3", label: "Exterior der.", short: "ED", x: 87, y: 86, pos: "Extremo derecho" },
    // Arriba: con amplitud, casi en línea, el central (punta) más arriba.
    { key: "D4", label: "Avanzado izq.", short: "AI", x: 30, y: 67, pos: "Lateral izquierdo" },
    { key: "D5", label: "Avanzado der.", short: "AD", x: 70, y: 67, pos: "Lateral derecho" },
    { key: "D6", label: "Punta", short: "PU", x: 50, y: 59, pos: "Central" },
    { key: "PT", label: "Portero", short: "PT", x: 50, y: 94, pos: "Portero" },
  ],
  "3-3": [
    // Abajo: los 3 un poco más cerrados que en el 3-2-1.
    { key: "D1", label: "Central izq.", short: "CI", x: 30, y: 85, pos: "Central" },
    { key: "D2", label: "Central", short: "CE", x: 50, y: 81, pos: "Central" },
    { key: "D3", label: "Central der.", short: "CD", x: 70, y: 85, pos: "Central" },
    // Arriba: con amplitud, casi en línea, el del centro un poco más arriba.
    { key: "D4", label: "Avanzado izq.", short: "AI", x: 21, y: 64, pos: "Lateral izquierdo" },
    { key: "D5", label: "Avanzado centro", short: "AC", x: 50, y: 60, pos: "Central" },
    { key: "D6", label: "Avanzado der.", short: "AD", x: 79, y: 64, pos: "Lateral derecho" },
    { key: "PT", label: "Portero", short: "PT", x: 50, y: 94, pos: "Portero" },
  ],
};

type ActiveSlot = { phase: "attack" | "defense"; slot: Slot } | null;

export default function LineupEditor({
  teamId,
  players,
  lineup,
  canEdit,
}: {
  teamId: string;
  players: Pick<Player, "id" | "name" | "number" | "positions">[];
  lineup: TeamLineup | null;
  canEdit: boolean;
}) {
  const [system, setSystem] = useState<DefenseSystem>(
    lineup?.defense_system ?? "6-0"
  );
  const [attack, setAttack] = useState<Record<string, string>>(
    lineup?.attack ?? {}
  );
  // Defensa indexada por `${sistema}:${hueco}` para recordar cada sistema.
  const [defense, setDefense] = useState<Record<string, string>>(
    lineup?.defense ?? {}
  );
  const [active, setActive] = useState<ActiveSlot>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );

  const byId = useMemo(() => {
    const m = new Map<string, (typeof players)[number]>();
    players.forEach((p) => m.set(p.id, p));
    return m;
  }, [players]);

  // Auto-guardado: se dispara ante cualquier cambio (sin botón), con un pequeño
  // retardo para agrupar cambios rápidos. Salta la primera ejecución (montaje).
  const first = useRef(true);
  useEffect(() => {
    if (!canEdit) return;
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus("saving");
    const t = setTimeout(async () => {
      const res = await saveLineupAction({
        teamId,
        defenseSystem: system,
        attack,
        defense,
      });
      setStatus(res.error ? "error" : "saved");
    }, 400);
    return () => clearTimeout(t);
  }, [system, attack, defense, canEdit, teamId]);

  function assign(playerId: string | null) {
    if (!active) return;
    const { phase, slot } = active;
    if (phase === "attack") {
      setAttack((prev) => {
        const next: Record<string, string> = {};
        // Un jugador no puede ocupar dos huecos del mismo bloque: se mueve.
        for (const [k, v] of Object.entries(prev)) {
          if (k === slot.key) continue;
          if (playerId && v === playerId) continue;
          next[k] = v;
        }
        if (playerId) next[slot.key] = playerId;
        return next;
      });
    } else {
      const sk = `${system}:${slot.key}`;
      setDefense((prev) => {
        const next: Record<string, string> = {};
        const prefix = `${system}:`;
        for (const [k, v] of Object.entries(prev)) {
          if (k === sk) continue;
          if (playerId && k.startsWith(prefix) && v === playerId) continue;
          next[k] = v;
        }
        if (playerId) next[sk] = playerId;
        return next;
      });
    }
    setActive(null);
  }

  const assignedFor = (phase: "attack" | "defense", slot: Slot) =>
    phase === "attack" ? attack[slot.key] : defense[`${system}:${slot.key}`];

  const markerName = (pid?: string) => {
    if (!pid) return null;
    const p = byId.get(pid);
    if (!p) return null;
    return p.name.split(" ")[0];
  };

  const slotMarker = (phase: "attack" | "defense", slot: Slot) => {
    const pid = assignedFor(phase, slot);
    const p = pid ? byId.get(pid) : undefined;
    const name = markerName(pid);
    const isActive = active?.phase === phase && active.slot.key === slot.key;
    return (
      <button
        key={`${phase}:${slot.key}`}
        type="button"
        disabled={!canEdit}
        onClick={() => setActive({ phase, slot })}
        style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
        className="absolute -translate-x-1/2 -translate-y-1/2 disabled:cursor-default"
        aria-label={`${slot.label}${p ? `: ${p.name}` : ""}`}
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-bold shadow transition ${
            isActive
              ? "border-white bg-white text-canvas"
              : p
                ? "border-brand bg-brand text-white"
                : "border-dashed border-white/70 bg-black/30 text-white/80"
          } ${canEdit ? "active:scale-90" : ""}`}
        >
          {p?.number ?? slot.short}
        </span>
        {/* Bajo el círculo solo el nombre del asignado: el código ya identifica
            el hueco y así las etiquetas no se solapan entre huecos próximos. */}
        {name && (
          <span className="mx-auto mt-0.5 block max-w-[64px] truncate rounded bg-black/65 px-1 text-center text-[10px] leading-tight text-white">
            {name}
          </span>
        )}
      </button>
    );
  };

  // Jugadores ordenados para el desplegable: primero los que tienen esa posición.
  const pickerPlayers = useMemo(() => {
    if (!active) return [];
    const want = active.slot.pos;
    return [...players].sort((a, b) => {
      const am = want && a.positions?.includes(want) ? 0 : 1;
      const bm = want && b.positions?.includes(want) ? 0 : 1;
      if (am !== bm) return am - bm;
      return (a.number ?? 999) - (b.number ?? 999);
    });
  }, [active, players]);

  return (
    <div>
      {/* Estado de guardado automático */}
      <div className="mb-2 flex h-5 items-center justify-end text-[11px]">
        {canEdit ? (
          status === "saving" ? (
            <span className="text-label-3">Guardando…</span>
          ) : status === "saved" ? (
            <span className="text-emerald-400">Guardado ✓</span>
          ) : status === "error" ? (
            <span className="text-red-400">No se pudo guardar</span>
          ) : (
            <span className="text-label-3">Se guarda solo</span>
          )
        ) : (
          <span className="text-label-3">Solo lectura</span>
        )}
      </div>

      {/* Cabecera de bloques (fuera de la pista para no tapar a los extremos) */}
      <div className="mb-1 flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wide text-label-2">
        <span>▲ Ataque</span>
        <span>Defensa · {system} ▼</span>
      </div>

      {/* Pista completa (misma que la pizarra) pero en VERTICAL: la pista 40×20 m
          se dibuja rotada 90° (portería arriba = ataque, abajo = defensa). */}
      <div
        className="relative mx-auto w-full overflow-hidden rounded-2xl border border-separator/50"
        style={{ aspectRatio: "1 / 2" }}
      >
        <svg
          viewBox="0 0 200 400"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <g transform="translate(200,0) rotate(90)">
            <CourtLines />
          </g>
        </svg>

        {ATTACK.map((s) => slotMarker("attack", s))}
        {DEFENSE[system].map((s) => slotMarker("defense", s))}
      </div>

      {/* Sistema defensivo */}
      <div className="mt-4">
        <p className="mb-1.5 text-xs font-semibold text-label-2">
          Sistema defensivo
        </p>
        <div className="flex flex-wrap gap-2">
          {DEFENSE_SYSTEMS.map((s) => {
            const on = system === s;
            return (
              <button
                key={s}
                type="button"
                disabled={!canEdit}
                onClick={() => setSystem(s)}
                aria-pressed={on}
                className={`min-h-[40px] rounded-full px-4 text-sm font-semibold transition active:scale-95 disabled:opacity-60 ${
                  on ? "bg-brand text-white" : "bg-surface-2 text-label-2"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desplegable de jugador para el hueco activo */}
      {active && canEdit && (
        <div className="mt-4 rounded-2xl border border-brand/40 bg-surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-label">
              {active.phase === "attack" ? "Ataque" : "Defensa"} ·{" "}
              {active.slot.label}
            </p>
            <button
              type="button"
              onClick={() => setActive(null)}
              className="text-[12px] text-label-3"
            >
              Cerrar
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {pickerPlayers.map((p) => {
              const match = active.slot.pos && p.positions?.includes(active.slot.pos);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => assign(p.id)}
                  className="flex items-center gap-2 rounded-xl border border-separator bg-canvas px-2.5 py-2 text-left text-sm text-label active:scale-95 active:border-brand"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-brand">
                    {p.number ?? "–"}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">{p.name}</span>
                    {match && (
                      <span className="block truncate text-[10px] text-emerald-400">
                        {active.slot.pos}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
            {players.length === 0 && (
              <p className="col-span-2 text-[13px] text-label-3">
                No hay jugadores en la plantilla.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => assign(null)}
            className="mt-2 w-full rounded-xl border border-dashed border-separator py-2 text-[13px] font-medium text-label-2"
          >
            Vaciar posición
          </button>
        </div>
      )}
    </div>
  );
}
