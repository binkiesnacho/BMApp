"use client";

import Link from "next/link";

type Opt = { id: string; name: string };

/**
 * Filtro por equipo del calendario (pastillas con scroll horizontal).
 * Conserva la pestaña activa (`tab`) al cambiar de equipo.
 */
export default function MatchTeamFilter({
  teams,
  value,
  tab,
  showAll,
}: {
  teams: Opt[];
  value: string;
  tab: string;
  showAll: boolean;
}) {
  const pills: Opt[] = [
    ...teams,
    ...(showAll ? [{ id: "all", name: "Todos" }] : []),
  ];
  if (pills.length <= 1) return null;

  return (
    <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
      {pills.map((o) => {
        const active = o.id === value;
        return (
          <Link
            key={o.id}
            href={`/matches?team=${o.id}&tab=${tab}`}
            scroll={false}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium ${
              active
                ? "bg-brand text-white"
                : "bg-surface-2 text-label-2"
            }`}
          >
            {o.name}
          </Link>
        );
      })}
    </div>
  );
}
