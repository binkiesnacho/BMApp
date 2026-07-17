"use client";

import type { GoalZone } from "@/lib/types/database";

const ZONES: { z: GoalZone; label: string }[] = [
  { z: 1, label: "Arriba izquierda" },
  { z: 2, label: "Arriba centro" },
  { z: 3, label: "Arriba derecha" },
  { z: 4, label: "Abajo izquierda" },
  { z: 5, label: "Abajo centro" },
  { z: 6, label: "Abajo derecha" },
];

/**
 * Portería dividida en 6 zonas (3 arriba, 3 abajo) para indicar por dónde fue
 * el tiro. La selección es opcional: se puede registrar el evento sin zona.
 */
export default function GoalZonePicker({
  value,
  onChange,
}: {
  value: GoalZone | null;
  onChange: (z: GoalZone | null) => void;
}) {
  return (
    <div>
      {/* Marco de portería: postes y travesaño alrededor de la rejilla. */}
      <div className="rounded-t-xl border-x-4 border-t-4 border-label-3/70 bg-surface/40 p-1.5">
        <div className="grid grid-cols-3 grid-rows-2 gap-1.5">
          {ZONES.map(({ z, label }) => {
            const active = value === z;
            return (
              <button
                key={z}
                type="button"
                aria-label={label}
                aria-pressed={active}
                onClick={() => onChange(active ? null : z)}
                className={`flex h-12 items-center justify-center rounded-lg border text-[11px] font-semibold transition active:scale-95 ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-separator/70 bg-surface text-label-3 hover:text-label-2"
                }`}
              >
                {active ? "✓" : z}
              </button>
            );
          })}
        </div>
      </div>
      <div className="h-1 rounded-b bg-label-3/70" />
      <p className="mt-1.5 text-center text-[11px] text-label-3">
        {value ? `Zona ${value} · toca de nuevo para quitarla` : "Zona de portería (opcional)"}
      </p>
    </div>
  );
}
