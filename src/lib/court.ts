import type { DrawFrame, DrawToken, TrainingDrawing } from "@/lib/types/database";

export const COURT_H = 200;
export const courtW = (court?: "full" | "half") => (court === "half" ? 200 : 400);

/** Milisegundos por transición entre fotogramas si la pizarra no lo especifica. */
export const DEFAULT_FRAME_MS = 900;

/** Id corto y estable para poder interpolar una ficha entre fotogramas. */
export function tokenId() {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * Fotogramas de una pizarra. Las pizarras guardadas antes de las jugadas no
 * tienen `frames`: se leen como un único fotograma a partir de strokes/tokens.
 */
export function framesOf(d: TrainingDrawing | null | undefined): DrawFrame[] {
  if (!d) return [{ strokes: [], tokens: [] }];
  if (d.frames?.length) return d.frames;
  return [{ strokes: d.strokes ?? [], tokens: d.tokens ?? [] }];
}

/**
 * Interpola las fichas del fotograma `a` hacia sus homólogas (mismo `id`) en `b`.
 * Las fichas sin pareja se quedan quietas; `t` va de 0 (a) a 1 (b).
 */
export function lerpTokens(a: DrawToken[], b: DrawToken[], t: number): DrawToken[] {
  return a.map((tok) => {
    const dest = tok.id ? b.find((x) => x.id === tok.id) : undefined;
    if (!dest) return tok;
    return {
      ...tok,
      x: tok.x + (dest.x - tok.x) * t,
      y: tok.y + (dest.y - tok.y) * t,
    };
  });
}

/** Suaviza la interpolación (ease-in-out) para que el movimiento no sea robótico. */
export function ease(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Fotograma visible en el instante `p` (0..frames.length-1) de la reproducción. */
export function frameAt(frames: DrawFrame[], p: number): DrawFrame {
  const i = Math.min(Math.floor(p), frames.length - 1);
  const a = frames[i];
  const b = frames[i + 1];
  if (!b) return a;
  return { strokes: a.strokes, tokens: lerpTokens(a.tokens, b.tokens, ease(p - i)) };
}

/** ¿Tiene algo dibujado? (para no guardar pizarras vacías) */
export function hasContent(frames: DrawFrame[]) {
  return frames.some((f) => f.strokes.length > 0 || f.tokens.length > 0);
}
