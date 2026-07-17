/** Tipos mínimos de `gifenc` (la librería no incluye los suyos). */
declare module "gifenc" {
  export type Palette = number[][];

  export interface WriteFrameOptions {
    palette?: Palette;
    /** Centésimas→ms de espera antes del siguiente fotograma. */
    delay?: number;
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
    dispose?: number;
    first?: boolean;
  }

  export interface Encoder {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: WriteFrameOptions
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    reset(): void;
  }

  export function GIFEncoder(options?: { auto?: boolean; initialCapacity?: number }): Encoder;

  export function quantize(
    data: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: { format?: "rgb565" | "rgb444" | "rgba4444"; oneBitAlpha?: boolean; clearAlpha?: boolean }
  ): Palette;

  export function applyPalette(
    data: Uint8Array | Uint8ClampedArray,
    palette: Palette,
    format?: "rgb565" | "rgb444" | "rgba4444"
  ): Uint8Array;

  export function nearestColorIndex(palette: Palette, pixel: number[]): number;
}
