"use client";

import { useRouter } from "next/navigation";
import type { Match } from "@/lib/types/database";

export default function MatchFilter({
  matches,
  current,
}: {
  matches: Match[];
  current: string;
}) {
  const router = useRouter();
  return (
    <select
      value={current}
      onChange={(e) => {
        const v = e.target.value;
        router.push(v ? `/stats?match=${v}` : "/stats");
      }}
      className="w-full rounded-xl bg-surface px-3 py-2.5 text-[15px] text-label outline-none"
    >
      <option value="">Todos los partidos</option>
      {matches.map((m) => (
        <option key={m.id} value={m.id}>
          vs {m.opponent} ·{" "}
          {new Date(m.date).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "short",
          })}
        </option>
      ))}
    </select>
  );
}
