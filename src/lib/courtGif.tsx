import CourtLines from "@/components/court/CourtLines";
import CourtToken from "@/components/court/CourtToken";
import { COURT_H, courtW, lerpTokens, ease } from "./court";
import type { DrawFrame } from "@/lib/types/database";

/** Píxeles por unidad de pista en el GIF exportado. */
const SCALE = 2;
/** Pasos de interpolación entre dos fotogramas. */
const STEPS = 12;
/** Pausa (ms) sobre cada fotograma antes de moverse al siguiente. */
const HOLD_MS = 500;

function toPoints(p: number[]) {
  const out: string[] = [];
  for (let i = 0; i + 1 < p.length; i += 2) out.push(`${p[i]},${p[i + 1]}`);
  return out.join(" ");
}

/** Un fotograma como SVG independiente (con fondo, para rasterizarlo). */
function FrameSvg({ w, frame }: { w: number; frame: DrawFrame }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${w} ${COURT_H}`}
      width={w * SCALE}
      height={COURT_H * SCALE}
    >
      <rect x={0} y={0} width={w} height={COURT_H} fill="#0B1226" />
      <CourtLines half={w === 200} />
      {frame.strokes.map((s, i) => (
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
      {frame.tokens.map((t, i) => (
        <CourtToken key={`t${i}`} shape={t.shape} x={t.x} y={t.y} />
      ))}
    </svg>
  );
}

/** Rasteriza un SVG (string) sobre el canvas dado. */
async function drawSvg(ctx: CanvasRenderingContext2D, markup: string, w: number, h: number) {
  const url = URL.createObjectURL(
    new Blob([markup], { type: "image/svg+xml;charset=utf-8" })
  );
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Exporta la jugada como GIF animado, codificado en el propio dispositivo
 * (sin servicios externos). Devuelve el Blob listo para descargar/compartir.
 */
export async function exportPlayGif({
  court,
  frames,
  frameMs,
  onProgress,
}: {
  court?: "full" | "half";
  frames: DrawFrame[];
  frameMs: number;
  onProgress?: (ratio: number) => void;
}): Promise<Blob> {
  // Carga diferida: nada de esto entra en el bundle hasta que se exporta.
  const [{ renderToStaticMarkup }, { GIFEncoder, quantize, applyPalette }] =
    await Promise.all([import("react-dom/server"), import("gifenc")]);

  const w = courtW(court);
  const pw = w * SCALE;
  const ph = COURT_H * SCALE;

  const canvas = document.createElement("canvas");
  canvas.width = pw;
  canvas.height = ph;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("No se pudo preparar el lienzo para el GIF.");

  // Secuencia: pausa en cada fotograma + pasos interpolados hacia el siguiente.
  const seq: { frame: DrawFrame; delay: number }[] = [];
  const stepDelay = Math.max(20, Math.round(frameMs / STEPS));
  for (let i = 0; i < frames.length; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    seq.push({ frame: a, delay: b ? HOLD_MS : Math.max(HOLD_MS, 900) });
    if (!b) break;
    for (let s = 1; s <= STEPS; s++) {
      seq.push({
        frame: { strokes: a.strokes, tokens: lerpTokens(a.tokens, b.tokens, ease(s / STEPS)) },
        delay: stepDelay,
      });
    }
  }

  const gif = GIFEncoder();
  for (let i = 0; i < seq.length; i++) {
    const { frame, delay } = seq[i];
    await drawSvg(ctx, renderToStaticMarkup(<FrameSvg w={w} frame={frame} />), pw, ph);
    const { data } = ctx.getImageData(0, 0, pw, ph);
    const palette = quantize(data, 64);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, pw, ph, { palette, delay });
    onProgress?.((i + 1) / seq.length);
    // Cede el hilo para no congelar la UI en móviles.
    if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  gif.finish();

  return new Blob([gif.bytesView() as unknown as BlobPart], { type: "image/gif" });
}
