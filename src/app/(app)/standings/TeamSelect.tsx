"use client";

import { useRouter } from "next/navigation";
import type { Team } from "@/lib/types/database";

/** Selector de equipo: navega a /standings?team=<id>. */
export default function TeamSelect({
  teams,
  value,
}: {
  teams: Team[];
  value: string;
}) {
  const router = useRouter();
  return (
    <select
      value={value}
      onChange={(e) => router.push(`/standings?team=${e.target.value}`)}
      className="w-full rounded-xl border border-separator bg-surface px-3 py-2.5 text-[15px] text-label outline-none focus:border-brand"
    >
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
