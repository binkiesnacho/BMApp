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
  fill = false,
}: {
  value?: TrainingDrawing | null;
  onChange: (d: TrainingDrawing | null) => void;
  /** Ocupa gran parte del alto disponible (modo pizarra a página). */
  fill?: boolean;
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

  const [fs, setFs] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
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

  // iOS Safari ignora `touch-action` en el <svg> y desplaza la página al hacer
  // un trazo largo (cancelando el puntero). Un listener táctil NO pasivo sobre
  // el contenedor bloquea ese scroll y permite trazos largos.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("touchmove", prevent, { passive: false });
    return () => el.removeEventListener("touchmove", prevent);
  }, []);

  function toCourt(clientX: number, clientY: number) {
    const r = svgRef.current!.getBoundingClientRect();
    // El SVG puede tener "letterbox" (preserveAspectRatio) cuando llena un
    // contenedor de otra proporción (p. ej. en pantalla completa): mapeamos
    // teniendo en cuenta la escala y los márgenes reales de la pista.
    const scale = Math.min(r.width / W, r.height / H);
    const offX = (r.width - W * scale) / 2;
    const offY = (r.height - H * scale) / 2;
    const x = Math.min(Math.max((clientX - r.left - offX) / scale, 0), W);
    const y = Math.min(Math.max((clientY - r.top - offY) / scale, 0), H);
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
  const big = fs || fill;
  const btn =
    "flex h-11 w-10 shrink-0 touch-none items-center justify-center rounded-xl border border-separator text-label active:scale-95 active:bg-surface-2";
  const iconBtn =
    "flex h-11 w-10 shrink-0 items-center justify-center rounded-xl border border-separator text-label transition active:scale-95 active:bg-surface-2 disabled:opacity-40";

  return (
    <div
      className={
        fs
          ? "fixed inset-0 z-[70] flex flex-col gap-2 bg-canvas p-3 pt-[calc(env(safe-area-inset-top)+0.6rem)] pb-[calc(env(safe-area-inset-bottom)+0.6rem)]"
          : "flex flex-col gap-2"
      }
    >
      {/* Barra de herramientas (una fila): pista, fichas, historial y pantalla completa. */}
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 shrink">
          <Segmented<"full" | "half">
            value={court}
            onChange={switchCourt}
            options={[
              { value: "full", label: "Completa" },
              { value: "half", label: "Media" },
            ]}
          />
        </div>
        <span aria-hidden className="mx-0.5 h-6 w-px shrink-0 bg-separator" />
        <button
          type="button"
          aria-label="Atacante (círculo)"
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
          aria-label="Defensor (triángulo)"
          onPointerDown={(e) => paletteDown(e, "defender")}
          onPointerMove={paletteMove}
          onPointerUp={paletteUp}
          className={btn}
        >
          <svg width="22" height="22" viewBox="0 0 24 24">
            <polygon points="12,4 20,19 4,19" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <button
          type="button"
          onClick={undo}
          disabled={history.length === 0}
          aria-label="Deshacer"
          className={iconBtn}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 7 4 12l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 12h11a5 5 0 0 1 0 10h-1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={history.length === 0}
          aria-label="Limpiar"
          className={iconBtn}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.8 12a1 1 0 0 0 1 .9h7.4a1 1 0 0 0 1-.9l.8-12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setFs((v) => !v)}
          aria-label={fs ? "Salir de pantalla completa" : "Pantalla completa"}
          className={btn}
        >
          {fs ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      {/* El contenedor HTML (no el <svg>) es quien iOS respeta para touch-action. */}
      <div
        ref={wrapRef}
        className={`touch-none select-none ${
          fs
            ? "grid min-h-0 flex-1 place-items-center"
            : fill
              ? "grid h-[64dvh] place-items-center"
              : ""
        }`}
        style={{ touchAction: "none", WebkitUserSelect: "none" }}
      >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className={`touch-none select-none rounded-xl ${big ? "h-full w-full" : "w-full"}`}
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
      </div>
    </div>
  );
}
