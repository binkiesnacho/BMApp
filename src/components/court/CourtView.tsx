import CourtLines from "./CourtLines";
import type { TrainingDrawing } from "@/lib/types/database";

function toPoints(p: number[]) {
  const out: string[] = [];
  for (let i = 0; i + 1 < p.length; i += 2) out.push(`${p[i]},${p[i + 1]}`);
  return out.join(" ");
}

/** Vista de solo lectura de una pizarra táctica sobre la pista. */
export default function CourtView({ drawing }: { drawing: TrainingDrawing }) {
  return (
    <svg
      viewBox="0 0 400 200"
      className="w-full rounded-xl"
      style={{ display: "block", touchAction: "none" }}
    >
      <CourtLines />
      {drawing.strokes.map((s, i) => (
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
  );
}
