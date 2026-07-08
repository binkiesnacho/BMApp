"use client";

import { useRef, useState } from "react";
import CourtLines from "./CourtLines";
import type { DrawStroke, TrainingDrawing } from "@/lib/types/database";

const COLORS = ["#ff453a", "#0a84ff", "#30d158", "#ffd60a", "#f2f2f7"];
const WIDTH = 2.6;

function toPoints(p: number[]) {
  const out: string[] = [];
  for (let i = 0; i + 1 < p.length; i += 2) out.push(`${p[i]},${p[i + 1]}`);
  return out.join(" ");
}

/**
 * Pizarra táctica: se dibuja con el dedo/ratón sobre la pista y se emite el
 * resultado como vector (trazos) mediante onChange. Herramientas: color,
 * deshacer y limpiar.
 */
export default function CourtDrawer({
  value,
  onChange,
}: {
  value?: TrainingDrawing | null;
  onChange: (d: TrainingDrawing | null) => void;
}) {
  const [strokes, setStrokes] = useState<DrawStroke[]>(value?.strokes ?? []);
  const [current, setCurrent] = useState<DrawStroke | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);

  function toCourt(e: React.PointerEvent) {
    const r = svgRef.current!.getBoundingClientRect();
    return [
      Math.round(((e.clientX - r.left) / r.width) * 400 * 10) / 10,
      Math.round(((e.clientY - r.top) / r.height) * 200 * 10) / 10,
    ];
  }

  function commit(next: DrawStroke[]) {
    setStrokes(next);
    onChange(next.length ? { strokes: next } : null);
  }

  function onDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawing.current = true;
    const [x, y] = toCourt(e);
    setCurrent({ color, width: WIDTH, points: [x, y] });
  }
  function onMove(e: React.PointerEvent) {
    if (!drawing.current || !current) return;
    const [x, y] = toCourt(e);
    setCurrent({ ...current, points: [...current.points, x, y] });
  }
  function onUp() {
    if (!drawing.current) return;
    drawing.current = false;
    if (current && current.points.length >= 4) commit([...strokes, current]);
    setCurrent(null);
  }

  const all = current ? [...strokes, current] : strokes;

  return (
    <div className="space-y-2">
      <svg
        ref={svgRef}
        viewBox="0 0 400 200"
        className="w-full touch-none rounded-xl"
        style={{ display: "block", cursor: "crosshair" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        <CourtLines />
        {all.map((s, i) => (
          <polyline
            key={i}
            points={toPoints(s.points)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      <div className="flex items-center gap-2">
        <div className="flex gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              className={`h-6 w-6 rounded-full ring-2 ${
                color === c ? "ring-label" : "ring-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => commit(strokes.slice(0, -1))}
            disabled={strokes.length === 0}
            className="rounded-lg border border-separator px-2.5 py-1 text-xs text-label disabled:opacity-40"
          >
            Deshacer
          </button>
          <button
            type="button"
            onClick={() => commit([])}
            disabled={strokes.length === 0}
            className="rounded-lg border border-separator px-2.5 py-1 text-xs text-label disabled:opacity-40"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}
