"use client";

import Link from "next/link";

type Opt = { id: string; name: string };

/**
 * Filtro por equipo de la lista de entrenamientos (pastillas con scroll
 * horizontal). Muestra los equipos de los que soy parte; los admin ven todos
 * los equipos del club más "Todos".
 */
export default function TrainingsTeamFilter({
  teams,
  value,
  showAll,
}: {
  teams: Opt[];
  value: string;
  showAll: boolean;
}) {
  const pills: Opt[] = [
    ...(showAll ? [{ id: "all", name: "Todos" }] : []),
    ...teams,
  ];
  if (pills.length <= 1) return null;

  return (
    <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
      {pills.map((o) => {
        const active = o.id === value;
        return (
          <Link
            key={o.id}
            href={`/trainings?team=${o.id}`}
            scroll={false}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium ${
              active ? "bg-brand text-white" : "bg-surface-2 text-label-2"
            }`}
          >
            {o.name}
          </Link>
        );
      })}
    </div>
  );
}
