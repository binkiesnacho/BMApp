"use client";

import { useState } from "react";
import { PLAYER_POSITIONS } from "@/lib/types/database";

/**
 * Selector de posiciones (varias por jugador). Usa checkboxes nativos con
 * name="positions", así el server action las lee con formData.getAll("positions").
 */
export default function PositionChips({
  initial = [],
}: {
  initial?: string[];
}) {
  const [sel, setSel] = useState<string[]>(initial);
  return (
    <div className="flex flex-wrap gap-1.5">
      {PLAYER_POSITIONS.map((p) => {
        const on = sel.includes(p);
        return (
          <label
            key={p}
            className={`inline-flex min-h-[32px] cursor-pointer items-center rounded-full border px-3 text-[12px] font-medium transition active:scale-95 ${
              on
                ? "border-brand bg-brand/20 text-sky-100"
                : "border-separator bg-canvas text-label-2"
            }`}
          >
            <input
              type="checkbox"
              name="positions"
              value={p}
              checked={on}
              onChange={() =>
                setSel((s) => (on ? s.filter((x) => x !== p) : [...s, p]))
              }
              className="sr-only"
            />
            {on ? "✓ " : ""}
            {p}
          </label>
        );
      })}
    </div>
  );
}
