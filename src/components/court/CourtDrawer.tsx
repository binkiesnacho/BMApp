"use client";

import { useEffect, useRef, useState } from "react";
import CourtLines from "./CourtLines";
import CourtToken from "./CourtToken";
import Segmented from "@/components/ui/Segmented";
import type {
  DrawStroke,
  DrawToken,
  TokenShape,
  TrainingDrawing,
} from "@/lib/types/database";

const STROKE = "#ffffff";
const WIDTH = 2.6;

function toPoints(p: number[]) {
  const out: string[] = [];
  for (let i = 0; i + 1 < p.length; i += 2) out.push(`${p[i]},${p[i + 1]}`);
  return out.join(" ");
}

/**
 * Pizarra táctica: se dibuja en blanco con el dedo/ratón sobre la pista y se
 * pueden arrastrar fichas (atacante = círculo, defensor = triángulo). Tabs para
 * pista completa o media pista. Emite el resultado como vector vía onChange.
 */
export default function CourtDrawer({
  value,
  onChange,
}: {
  value?: TrainingDrawing | null;
  onChange: (d: TrainingDrawing | null) => void;
}) {
  const [court, setCourt] = useState<"full" | "half">(value?.court ?? "full");
  const [strokes, setStrokes] = useState<DrawStroke[]>(value?.strokes ?? []);
  const [tokens, setTokens] = useState<DrawToken[]>(value?.tokens ?? []);
  const [current, setCurrent] = useState<DrawStroke | null>(null);
  const [preview, setPreview] = useState<DrawToken | null>(null);
  const [history, setHistory] = useState<("s" | "t")[]>(() => [
    ...(value?.strokes ?? []).map(() => "s" as const),
    ...(value?.tokens ?? []).map(() => "t" as const),
  ]);

  const svgRef = useRef<SVGSVGElement>(null);
  const currentRef = useRef<DrawStroke | null>(null);
  const drawingRef = useRef(false);
  const moveRef = useRef<number | null>(null);
  const newShapeRef = useRef<TokenShape | null>(null);

  const W = court === "half" ? 200 : 400;
  const H = 200;

  useEffect(() => {
    onChange(strokes.length || tokens.length ? { court, strokes, tokens } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes, tokens, court]);

  function toCourt(clientX: number, clientY: number) {
    const r = svgRef.current!.getBoundingClientRect();
    const x = Math.min(Math.max(((clientX - r.left) / r.width) * W, 0), W);
    const y = Math.min(Math.max(((clientY - r.top) / r.height) * H, 0), H);
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  }
  function inside(clientX: number, clientY: number) {
    const r = svgRef.current?.getBoundingClientRect();
    return !!r && clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
  }
  function setCur(c: DrawStroke | null) {
    currentRef.current = c;
    setCurrent(c);
  }
  // La captura de puntero puede fallar en algunos navegadores móviles (iOS);
  // la envolvemos para que no rompa el dibujo si lanza.
  function capture(el: Element | null, pointerId: number) {
    try {
      (el as Element & { setPointerCapture(id: number): void })?.setPointerCapture(
        pointerId
      );
    } catch {
      /* noop */
    }
  }

  /* -------- Dibujo y movimiento de fichas (sobre el SVG) -------- */
  function svgDown(e: React.PointerEvent) {
    e.preventDefault();
    capture(svgRef.current, e.pointerId);
    drawingRef.current = true;
    const [x, y] = toCourt(e.clientX, e.clientY);
    setCur({ color: STROKE, width: WIDTH, points: [x, y] });
  }
  function svgMove(e: React.PointerEvent) {
    if (drawingRef.current && currentRef.current) {
      const [x, y] = toCourt(e.clientX, e.clientY);
      setCur({ ...currentRef.current, points: [...currentRef.current.points, x, y] });
    } else if (moveRef.current != null) {
      const [x, y] = toCourt(e.clientX, e.clientY);
      const idx = moveRef.current;
      setTokens((ts) => ts.map((t, i) => (i === idx ? { ...t, x, y } : t)));
    }
  }
  function svgUp() {
    if (drawingRef.current) {
      drawingRef.current = false;
      const c = currentRef.current;
      if (c && c.points.length >= 4) {
        setStrokes((s) => [...s, c]);
        setHistory((h) => [...h, "s"]);
      }
      setCur(null);
    }
    moveRef.current = null;
  }
  function tokenDown(e: React.PointerEvent, i: number) {
    e.stopPropagation();
    e.preventDefault();
    capture(svgRef.current, e.pointerId);
    moveRef.current = i;
  }

  /* -------- Arrastre de una ficha nueva desde la paleta -------- */
  function paletteDown(e: React.PointerEvent, shape: TokenShape) {
    e.preventDefault();
    capture(e.currentTarget as Element, e.pointerId);
    newShapeRef.current = shape;
    setPreview(null);
  }
  function paletteMove(e: React.PointerEvent) {
    if (!newShapeRef.current) return;
    if (inside(e.clientX, e.clientY)) {
      const [x, y] = toCourt(e.clientX, e.clientY);
      setPreview({ shape: newShapeRef.current, x, y });
    } else {
      setPreview(null);
    }
  }
  function paletteUp(e: React.PointerEvent) {
    const shape = newShapeRef.current;
    newShapeRef.current = null;
    if (shape && inside(e.clientX, e.clientY)) {
      const [x, y] = toCourt(e.clientX, e.clientY);
      setTokens((ts) => [...ts, { shape, x, y }]);
      setHistory((h) => [...h, "t"]);
    }
    setPreview(null);
  }

  function undo() {
    setHistory((h) => {
      const last = h[h.length - 1];
      if (last === "s") setStrokes((s) => s.slice(0, -1));
      else if (last === "t") setTokens((t) => t.slice(0, -1));
      return h.slice(0, -1);
    });
  }
  function clearAll() {
    setStrokes([]);
    setTokens([]);
    setHistory([]);
  }
  function switchCourt(c: "full" | "half") {
    if (c === court) return;
    clearAll();
    setCourt(c);
  }

  const allStrokes = current ? [...strokes, current] : strokes;
  const btn =
    "touch-none rounded-lg border border-separator px-2 py-1 text-label";

  return (
    <div className="space-y-2">
      <Segmented<"full" | "half">
        value={court}
        onChange={switchCourt}
        options={[
          { value: "full", label: "Pista completa" },
          { value: "half", label: "Media pista" },
        ]}
      />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none rounded-xl"
        style={{
          display: "block",
          cursor: "crosshair",
          touchAction: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
          WebkitTouchCallout: "none",
        }}
        onPointerDown={svgDown}
        onPointerMove={svgMove}
        onPointerUp={svgUp}
        onPointerCancel={svgUp}
        onLostPointerCapture={svgUp}
        onPointerLeave={svgUp}
      >
        <CourtLines half={court === "half"} />
        {allStrokes.map((s, i) => (
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
        {tokens.map((t, i) => (
          <g key={i} onPointerDown={(e) => tokenDown(e, i)} style={{ cursor: "move" }}>
            <circle cx={t.x} cy={t.y} r={12} fill="transparent" />
            <CourtToken shape={t.shape} x={t.x} y={t.y} />
          </g>
        ))}
        {preview && (
          <CourtToken shape={preview.shape} x={preview.x} y={preview.y} opacity={0.5} />
        )}
      </svg>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-label-3">Arrastra:</span>
        <button
          type="button"
          aria-label="Atacante"
          onPointerDown={(e) => paletteDown(e, "attacker")}
          onPointerMove={paletteMove}
          onPointerUp={paletteUp}
          className={btn}
        >
          <svg width="22" height="22" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Defensor"
          onPointerDown={(e) => paletteDown(e, "defender")}
          onPointerMove={paletteMove}
          onPointerUp={paletteUp}
          className={btn}
        >
          <svg width="22" height="22" viewBox="0 0 24 24">
            <polygon points="12,4 20,19 4,19" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={history.length === 0}
            className="rounded-lg border border-separator px-2.5 py-1 text-xs text-label disabled:opacity-40"
          >
            Deshacer
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={history.length === 0}
            className="rounded-lg border border-separator px-2.5 py-1 text-xs text-label disabled:opacity-40"
          >
            Limpiar
          </button>
        </div>
      </div>

      <p className="text-[11px] text-label-3">
        Círculo = atacante, triángulo = defensor. Arrástralos a la pista y muévelos;
        dibuja líneas con el dedo.
      </p>
    </div>
  );
}
