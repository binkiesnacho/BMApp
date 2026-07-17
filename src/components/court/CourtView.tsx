"use client";

import { useEffect, useState } from "react";
import CourtLines from "./CourtLines";
import CourtToken from "./CourtToken";
import { COURT_H, DEFAULT_FRAME_MS, courtW, frameAt, framesOf } from "@/lib/court";
import type { TrainingDrawing } from "@/lib/types/database";

function toPoints(p: number[]) {
  const out: string[] = [];
  for (let i = 0; i + 1 < p.length; i += 2) out.push(`${p[i]},${p[i + 1]}`);
  return out.join(" ");
}

/**
 * Vista de solo lectura de una pizarra. Si tiene varios fotogramas es una
 * jugada: aparece un botón para reproducirla con las fichas interpolándose.
 */
export default function CourtView({ drawing }: { drawing: TrainingDrawing }) {
  const frames = framesOf(drawing);
  const frameMs = drawing.frameMs ?? DEFAULT_FRAME_MS;
  const isPlay = frames.length > 1;

  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const t0 = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const p = Math.min((now - t0) / frameMs, frames.length - 1);
      setPos(p);
      if (p >= frames.length - 1) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [playing, frames, frameMs]);

  const shown = playing ? frameAt(frames, pos) : frames[0];
  const w = courtW(drawing.court);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${COURT_H}`}
        className="w-full rounded-xl"
        style={{ display: "block" }}
      >
        <CourtLines half={drawing.court === "half"} />
        {shown.strokes.map((s, i) => (
          <polyline
            key={`s${i}`}
            points={toPoints(s.points)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {shown.tokens.map((t, i) => (
          <CourtToken key={t.id ?? `t${i}`} shape={t.shape} x={t.x} y={t.y} />
        ))}
      </svg>

      {isPlay && (
        <>
          <span className="absolute left-2 top-2 rounded-full bg-canvas/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-200 backdrop-blur">
            Jugada · {frames.length}
          </span>
          <button
            type="button"
            onClick={() => {
              setPos(0);
              setPlaying((v) => !v);
            }}
            aria-label={playing ? "Detener jugada" : "Reproducir jugada"}
            className="absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full border border-separator bg-canvas/80 text-label backdrop-blur active:scale-95"
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
        </>
      )}
    </div>
  );
}
