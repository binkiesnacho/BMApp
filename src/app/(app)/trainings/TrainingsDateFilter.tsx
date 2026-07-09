"use client";

import { useRouter } from "next/navigation";

/**
 * Filtro por rango de fechas de los entrenamientos. Conserva el equipo activo.
 */
export default function TrainingsDateFilter({
  team,
  from,
  to,
}: {
  team: string;
  from?: string;
  to?: string;
}) {
  const router = useRouter();

  function nav(next: { from?: string; to?: string }) {
    const p = new URLSearchParams();
    if (team) p.set("team", team);
    const f = next.from !== undefined ? next.from : from;
    const t = next.to !== undefined ? next.to : to;
    if (f) p.set("from", f);
    if (t) p.set("to", t);
    router.push(`/trainings?${p.toString()}`, { scroll: false });
  }

  const inputCls =
    "min-w-0 flex-1 rounded-xl border border-separator bg-canvas px-3 py-2 text-[13px] text-label outline-none focus:border-brand";

  return (
    <div className="mb-3 flex items-center gap-2">
      <input
        type="date"
        aria-label="Desde"
        value={from ?? ""}
        max={to || undefined}
        onChange={(e) => nav({ from: e.target.value })}
        className={inputCls}
      />
      <span className="text-label-3">–</span>
      <input
        type="date"
        aria-label="Hasta"
        value={to ?? ""}
        min={from || undefined}
        onChange={(e) => nav({ to: e.target.value })}
        className={inputCls}
      />
      {(from || to) && (
        <button
          type="button"
          onClick={() => nav({ from: "", to: "" })}
          className="shrink-0 rounded-xl border border-separator px-2.5 py-2 text-[13px] text-label-2 hover:text-label"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
