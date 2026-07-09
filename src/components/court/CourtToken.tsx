import type { TokenShape } from "@/lib/types/database";

/** Dibuja una ficha (atacante = círculo, defensor = triángulo) en blanco. */
export default function CourtToken({
  shape,
  x,
  y,
  opacity = 1,
}: {
  shape: TokenShape;
  x: number;
  y: number;
  opacity?: number;
}) {
  if (shape === "attacker") {
    return (
      <circle
        cx={x}
        cy={y}
        r={8}
        fill="none"
        stroke="#ffffff"
        strokeWidth={2.2}
        opacity={opacity}
      />
    );
  }
  const pts = `${x},${y - 9} ${x - 8},${y + 7} ${x + 8},${y + 7}`;
  return (
    <polygon points={pts} fill="none" stroke="#ffffff" strokeWidth={2.2} opacity={opacity} />
  );
}
