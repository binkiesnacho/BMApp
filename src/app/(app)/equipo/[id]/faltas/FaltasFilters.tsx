"use client";

import { useRouter } from "next/navigation";

type Opt = { id: string; name: string; number: number | null };

/** Filtros de la vista de faltas: por jugador y por rango de fechas. */
export default function FaltasFilters({
  teamId,
  players,
  player,
  from,
  to,
}: {
  teamId: string;
  players: Opt[];
  player?: string;
  from?: string;
  to?: string;
}) {
  const router = useRouter();

  function nav(next: { player?: string; from?: string; to?: string }) {
    const p = new URLSearchParams();
    const pl = next.player !== undefined ? next.player : player;
    const f = next.from !== undefined ? next.from : from;
    const t = next.to !== undefined ? next.to : to;
    if (pl) p.set("player", pl);
    if (f) p.set("from", f);
    if (t) p.set("to", t);
    const qs = p.toString();
    router.push(`/equipo/${teamId}/faltas${qs ? `?${qs}` : ""}`, {
      scroll: false,
    });
  }

  const ctl =
    "min-w-0 rounded-xl border border-separator bg-canvas px-3 py-2 text-[13px] text-label outline-none focus:border-brand";

  return (
    <div className="mb-4 space-y-2">
      <select
        value={player ?? ""}
        onChange={(e) => nav({ player: e.target.value })}
        className={ctl + " w-full"}
      >
        <option value="">Todos los jugadores</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.number != null ? `${p.number} · ` : ""}
            {p.name}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <input
          type="date"
          aria-label="Desde"
          value={from ?? ""}
          max={to || undefined}
          onChange={(e) => nav({ from: e.target.value })}
          className={ctl + " flex-1"}
        />
        <span className="text-label-3">–</span>
        <input
          type="date"
          aria-label="Hasta"
          value={to ?? ""}
          min={from || undefined}
          onChange={(e) => nav({ to: e.target.value })}
          className={ctl + " flex-1"}
        />
        {(player || from || to) && (
          <button
            type="button"
            onClick={() => nav({ player: "", from: "", to: "" })}
            className="shrink-0 rounded-xl border border-separator px-2.5 py-2 text-[13px] text-label-2 hover:text-label"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
