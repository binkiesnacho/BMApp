"use client";

import { useEffect, useRef, useState } from "react";
import CourtLines from "./CourtLines";
import CourtToken from "./CourtToken";
import Segmented from "@/components/ui/Segmented";
import {
  COURT_H,
  DEFAULT_FRAME_MS,
  courtW,
  frameAt,
  framesOf,
  hasContent,
  tokenId,
} from "@/lib/court";
import { exportPlayGif } from "@/lib/courtGif";
import type {
  DrawFrame,
  DrawStroke,
  DrawToken,
  TokenShape,
  TrainingDrawing,
} from "@/lib/types/database";

const STROKE = "#ffffff";
const WIDTH = 2.6;
/** Radio (en unidades de pista) para tocar una ficha o borrar un trazo. */
const HIT_TOKEN = 14;
const HIT_STROKE = 8;

function toPoints(p: number[]) {
  const out: string[] = [];
  for (let i = 0; i + 1 < p.length; i += 2) out.push(`${p[i]},${p[i + 1]}`);
  return out.join(" ");
}

/** Asegura que toda ficha tenga id (las pizarras antiguas no lo tienen). */
function withIds(frames: DrawFrame[]): DrawFrame[] {
  return frames.map((f) => ({
    strokes: f.strokes ?? [],
    tokens: (f.tokens ?? []).map((t) => (t.id ? t : { ...t, id: tokenId() })),
  }));
}

/**
 * Pizarra táctica: se dibuja con el dedo sobre la pista y se arrastran fichas
 * (atacante, defensor, balón). Con varios fotogramas se convierte en una jugada
 * animada: al reproducir, cada ficha se desplaza (lerp) hacia su posición del
 * fotograma siguiente, y se puede exportar como GIF.
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
  const [frames, setFrames] = useState<DrawFrame[]>(() => withIds(framesOf(value)));
  const [idx, setIdx] = useState(0);
  const [tool, setTool] = useState<"draw" | "erase">("draw");
  const [current, setCurrent] = useState<DrawStroke | null>(null);
  const [preview, setPreview] = useState<DrawToken | null>(null);
  const [undoStack, setUndoStack] = useState<DrawFrame[][]>([]);
  const [fs, setFs] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playPos, setPlayPos] = useState(0);
  const [gifBusy, setGifBusy] = useState(false);
  const [gifPct, setGifPct] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  const frameMs = value?.frameMs ?? DEFAULT_FRAME_MS;

  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<DrawStroke | null>(null);
  const drawingRef = useRef(false);
  const erasingRef = useRef(false);
  const moveRef = useRef<number | null>(null);
  const newShapeRef = useRef<TokenShape | null>(null);

  const W = courtW(court);
  const H = COURT_H;
  const frame = frames[idx] ?? { strokes: [], tokens: [] };
  const shown = playing ? frameAt(frames, playPos) : frame;

  useEffect(() => {
    const f0 = frames[0] ?? { strokes: [], tokens: [] };
    onChange(
      hasContent(frames)
        ? { court, strokes: f0.strokes, tokens: f0.tokens, frames, frameMs }
        : null
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, court]);

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

  // Reproducción de la jugada: avanza la posición y se detiene al final.
  useEffect(() => {
    if (!playing) return;
    if (frames.length < 2) {
      setPlaying(false);
      return;
    }
    const t0 = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const p = Math.min((now - t0) / frameMs, frames.length - 1);
      setPlayPos(p);
      if (p >= frames.length - 1) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [playing, frames, frameMs]);

  /* ------------------------------ Utilidades ------------------------------ */
  function pushUndo() {
    setUndoStack((s) => [...s.slice(-29), frames]);
  }
  function setFrame(updater: (f: DrawFrame) => DrawFrame) {
    setFrames((fs) => fs.map((f, i) => (i === idx ? updater(f) : f)));
  }
  function toCourt(clientX: number, clientY: number) {
    const r = svgRef.current!.getBoundingClientRect();
    // El SVG puede tener "letterbox" (preserveAspectRatio) cuando llena un
    // contenedor de otra proporción: mapeamos con la escala y márgenes reales.
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
  // La captura de puntero puede fallar en algunos navegadores móviles (iOS).
  function capture(el: Element | null, pointerId: number) {
    try {
      (el as Element & { setPointerCapture(id: number): void })?.setPointerCapture(pointerId);
    } catch {
      /* noop */
    }
  }

  /** Borra la ficha o el trazo que haya bajo el punto (sin apilar undo). */
  function eraseAt(x: number, y: number) {
    setFrame((f) => {
      const ti = f.tokens.findIndex((t) => Math.hypot(t.x - x, t.y - y) <= HIT_TOKEN);
      if (ti >= 0) return { ...f, tokens: f.tokens.filter((_, i) => i !== ti) };
      let best = -1;
      let bestD = HIT_STROKE;
      f.strokes.forEach((s, i) => {
        for (let k = 0; k + 1 < s.points.length; k += 2) {
          const d = Math.hypot(s.points[k] - x, s.points[k + 1] - y);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
      });
      if (best >= 0) return { ...f, strokes: f.strokes.filter((_, i) => i !== best) };
      return f;
    });
  }

  /* -------- Dibujo, borrado y movimiento de fichas (sobre el SVG) -------- */
  function svgDown(e: React.PointerEvent) {
    if (playing) return;
    e.preventDefault();
    capture(svgRef.current, e.pointerId);
    const [x, y] = toCourt(e.clientX, e.clientY);
    if (tool === "erase") {
      pushUndo();
      erasingRef.current = true;
      eraseAt(x, y);
      return;
    }
    drawingRef.current = true;
    setCur({ color: STROKE, width: WIDTH, points: [x, y] });
  }
  function svgMove(e: React.PointerEvent) {
    if (playing) return;
    const [x, y] = toCourt(e.clientX, e.clientY);
    if (erasingRef.current) {
      eraseAt(x, y);
    } else if (drawingRef.current && currentRef.current) {
      setCur({ ...currentRef.current, points: [...currentRef.current.points, x, y] });
    } else if (moveRef.current != null) {
      const i = moveRef.current;
      setFrame((f) => ({
        ...f,
        tokens: f.tokens.map((t, k) => (k === i ? { ...t, x, y } : t)),
      }));
    }
  }
  function svgUp() {
    if (drawingRef.current) {
      drawingRef.current = false;
      const c = currentRef.current;
      if (c && c.points.length >= 4) {
        pushUndo();
        setFrame((f) => ({ ...f, strokes: [...f.strokes, c] }));
      }
      setCur(null);
    }
    erasingRef.current = false;
    moveRef.current = null;
  }
  function tokenDown(e: React.PointerEvent, i: number) {
    if (playing) return;
    e.stopPropagation();
    e.preventDefault();
    capture(svgRef.current, e.pointerId);
    if (tool === "erase") {
      pushUndo();
      setFrame((f) => ({ ...f, tokens: f.tokens.filter((_, k) => k !== i) }));
      return;
    }
    pushUndo();
    moveRef.current = i;
  }

  /* -------- Arrastre de una ficha nueva desde la paleta -------- */
  function paletteDown(e: React.PointerEvent, shape: TokenShape) {
    if (playing) return;
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
      pushUndo();
      setFrame((f) => ({ ...f, tokens: [...f.tokens, { id: tokenId(), shape, x, y }] }));
    }
    setPreview(null);
  }

  /* ------------------------------- Acciones ------------------------------- */
  function undo() {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    setFrames(last);
    setIdx((i) => Math.min(i, last.length - 1));
    setUndoStack((s) => s.slice(0, -1));
  }
  function clearFrame() {
    pushUndo();
    setFrame(() => ({ strokes: [], tokens: [] }));
  }
  function switchCourt(c: "full" | "half") {
    if (c === court) return;
    // Las coordenadas no son equivalentes entre pistas: se empieza de cero.
    pushUndo();
    setFrames([{ strokes: [], tokens: [] }]);
    setIdx(0);
    setCourt(c);
  }
  function addFrame() {
    pushUndo();
    // Duplica el fotograma actual conservando los ids: así las fichas saben
    // hacia dónde moverse y la interpolación funciona.
    const copy: DrawFrame = {
      strokes: frame.strokes.map((s) => ({ ...s, points: [...s.points] })),
      tokens: frame.tokens.map((t) => ({ ...t })),
    };
    setFrames((fs) => [...fs.slice(0, idx + 1), copy, ...fs.slice(idx + 1)]);
    setIdx(idx + 1);
  }
  function deleteFrame() {
    if (frames.length < 2) return;
    pushUndo();
    setFrames((fs) => fs.filter((_, i) => i !== idx));
    setIdx((i) => Math.max(0, i - 1));
  }
  async function doExportGif() {
    setErr(null);
    setGifBusy(true);
    setGifPct(0);
    try {
      const blob = await exportPlayGif({ court, frames, frameMs, onProgress: setGifPct });
      const file = new File([blob], `jugada-${Date.now()}.gif`, { type: "image/gif" });
      // En móvil, compartir directamente (WhatsApp…); si no, descargar.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Jugada" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (e) {
      // Cancelar el diálogo de compartir no es un error que mostrar.
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setErr(e instanceof Error ? e.message : "No se pudo exportar el GIF.");
      }
    } finally {
      setGifBusy(false);
    }
  }

  /* -------------------------------- Render -------------------------------- */
  const allStrokes = !playing && current ? [...shown.strokes, current] : shown.strokes;
  const big = fs || fill;
  const btn =
    "flex h-11 w-10 shrink-0 touch-none items-center justify-center rounded-xl border border-separator text-label active:scale-95 active:bg-surface-2 disabled:opacity-40";
  const on = "border-brand bg-brand/20 text-sky-200";
  const canPlay = frames.length > 1 && !gifBusy;

  return (
    <div
      className={
        fs
          ? "fixed inset-0 z-[70] flex flex-col gap-2 bg-canvas p-3 pt-[calc(env(safe-area-inset-top)+0.6rem)] pb-[calc(env(safe-area-inset-bottom)+0.6rem)]"
          : "flex flex-col gap-2"
      }
    >
      {/* Barra de herramientas (una fila; hace scroll lateral si no cabe). */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
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
          onClick={() => setTool("draw")}
          aria-pressed={tool === "draw"}
          aria-label="Dibujar"
          className={`${btn} ${tool === "draw" ? on : ""}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="m4 20 1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setTool("erase")}
          aria-pressed={tool === "erase"}
          aria-label="Borrador"
          className={`${btn} ${tool === "erase" ? on : ""}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M8.5 19H20M4.8 16.2l7-7a2 2 0 0 1 2.8 0l4.4 4.4a2 2 0 0 1 0 2.8L16.5 19H10l-5.2-5.2a2 2 0 0 1 0-2.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
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
          aria-label="Balón"
          onPointerDown={(e) => paletteDown(e, "ball")}
          onPointerMove={paletteMove}
          onPointerUp={paletteUp}
          className={btn}
        >
          <svg width="22" height="22" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="6" fill="#ffb020" stroke="currentColor" strokeWidth="1.4" />
            <path d="M6 12a6 6 0 0 0 12 0M12 6a6 6 0 0 0 0 12" fill="none" stroke="#8a5200" strokeWidth="1" />
          </svg>
        </button>
        <span aria-hidden className="mx-0.5 h-6 w-px shrink-0 bg-separator" />

        <button
          type="button"
          onClick={undo}
          disabled={undoStack.length === 0}
          aria-label="Deshacer"
          className={btn}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 7 4 12l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 12h11a5 5 0 0 1 0 10h-1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={clearFrame}
          disabled={!frame.strokes.length && !frame.tokens.length}
          aria-label="Limpiar fotograma"
          className={btn}
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
            cursor: tool === "erase" ? "cell" : "crosshair",
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
          {shown.tokens.map((t, i) => (
            <g
              key={t.id ?? i}
              onPointerDown={(e) => tokenDown(e, i)}
              style={{ cursor: playing ? "default" : "move" }}
            >
              {/* Zona de toque generosa: mover fichas con el dedo debe ser fácil. */}
              <circle cx={t.x} cy={t.y} r={HIT_TOKEN} fill="transparent" />
              <CourtToken shape={t.shape} x={t.x} y={t.y} />
            </g>
          ))}
          {preview && (
            <CourtToken shape={preview.shape} x={preview.x} y={preview.y} opacity={0.5} />
          )}
        </svg>
      </div>

      {/* Fotogramas de la jugada + reproducir/exportar. */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
        {frames.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setPlaying(false);
              setIdx(i);
            }}
            aria-label={`Fotograma ${i + 1}`}
            aria-current={i === idx}
            className={`h-9 w-9 shrink-0 rounded-lg border text-[13px] font-semibold ${
              i === idx && !playing
                ? "border-brand bg-brand text-white"
                : "border-separator text-label-2"
            }`}
          >
            {i + 1}
          </button>
        ))}
        <button
          type="button"
          onClick={addFrame}
          aria-label="Añadir fotograma (duplica el actual)"
          className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-dashed border-separator px-2.5 text-[13px] font-medium text-label-2 active:scale-95"
        >
          <span className="text-[15px] leading-none">＋</span> Fotograma
        </button>
        {frames.length > 1 && (
          <button
            type="button"
            onClick={deleteFrame}
            aria-label="Eliminar fotograma actual"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-separator text-label-3 active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        )}

        <div className="ml-auto flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setPlayPos(0);
              setPlaying((v) => !v);
            }}
            disabled={!canPlay}
            aria-label={playing ? "Detener" : "Reproducir jugada"}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border border-separator text-label active:scale-95 disabled:opacity-40 ${
              playing ? on : ""
            }`}
          >
            {playing ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={doExportGif}
            disabled={frames.length < 2 || gifBusy}
            className="flex h-9 shrink-0 items-center rounded-lg border border-separator px-2.5 text-[12px] font-bold text-label active:scale-95 disabled:opacity-40"
          >
            {gifBusy ? `${Math.round(gifPct * 100)}%` : "GIF"}
          </button>
        </div>
      </div>

      {err && <p className="text-[12px] text-negative">{err}</p>}
    </div>
  );
}
