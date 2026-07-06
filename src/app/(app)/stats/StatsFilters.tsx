"use client";

import { useRouter } from "next/navigation";
import type { Match, Team } from "@/lib/types/database";

export default function StatsFilters({
  teams,
  teamValue,
  matches,
  matchValue,
}: {
  teams: Team[];
  teamValue: string;
  matches: Match[];
  matchValue: string;
}) {
  const router = useRouter();
  const cls =
    "w-full rounded-xl bg-surface px-3 py-2.5 text-[15px] text-label outline-none";

  return (
    <div className="space-y-2">
      <select
        value={teamValue}
        onChange={(e) => router.push(`/stats?team=${e.target.value}`)}
        className={cls}
      >
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
        <option value="all">Todo el club</option>
      </select>

      {matches.length > 0 && (
        <select
          value={matchValue}
          onChange={(e) => {
            const m = e.target.value;
            router.push(
              `/stats?team=${teamValue}${m ? `&match=${m}` : ""}`
            );
          }}
          className={cls}
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
      )}
    </div>
  );
}
