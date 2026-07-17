import type { TokenShape } from "@/lib/types/database";

/** Dibuja una ficha: atacante = círculo, defensor = triángulo, balón = disco. */
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
  if (shape === "ball") {
    // Relleno naranja para distinguirlo del atacante de un vistazo.
    return (
      <g opacity={opacity}>
        <circle cx={x} cy={y} r={5.4} fill="#ffb020" stroke="#ffffff" strokeWidth={1.4} />
        <path
          d={`M${x - 5.4},${y} a5.4,5.4 0 0 0 10.8,0 M${x},${y - 5.4} a5.4,5.4 0 0 0 0,10.8`}
          fill="none"
          stroke="#8a5200"
          strokeWidth={0.9}
        />
      </g>
    );
  }
  const pts = `${x},${y - 9} ${x - 8},${y + 7} ${x + 8},${y + 7}`;
  return (
    <polygon points={pts} fill="none" stroke="#ffffff" strokeWidth={2.2} opacity={opacity} />
  );
}
