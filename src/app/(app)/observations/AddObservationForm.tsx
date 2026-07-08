"use client";

import { useRef } from "react";
import { addObservationAction } from "./actions";
import type { ObservationSource } from "@/lib/types/database";

export interface AddContext {
  teamId: string;
  sourceType: ObservationSource;
  occurredAt: string;
  trainingId?: string;
  matchId?: string;
}

/** Formulario para añadir una observación (privada del cuerpo técnico). */
export default function AddObservationForm({
  ctx,
  players,
  fixedPlayerId,
}: {
  ctx: AddContext;
  players?: { id: string; name: string; number: number | null }[];
  fixedPlayerId?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const inputCls =
    "w-full rounded-xl border border-separator bg-canvas px-3 py-2 text-sm text-label outline-none focus:border-brand";

  return (
    <form
      ref={ref}
      action={async (fd) => {
        await addObservationAction(fd);
        ref.current?.reset();
      }}
      className="mb-3 space-y-2 rounded-2xl bg-surface p-3"
    >
      <input type="hidden" name="teamId" value={ctx.teamId} />
      <input type="hidden" name="sourceType" value={ctx.sourceType} />
      <input type="hidden" name="occurredAt" value={ctx.occurredAt} />
      {ctx.trainingId && <input type="hidden" name="trainingId" value={ctx.trainingId} />}
      {ctx.matchId && <input type="hidden" name="matchId" value={ctx.matchId} />}

      {fixedPlayerId ? (
        <input type="hidden" name="playerId" value={fixedPlayerId} />
      ) : players ? (
        <select name="playerId" defaultValue="" className={inputCls}>
          <option value="">General (sin jugador)</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.number != null ? `${p.number} · ` : ""}
              {p.name}
            </option>
          ))}
        </select>
      ) : null}

      <textarea
        name="body"
        required
        rows={2}
        placeholder="Observación (privada del cuerpo técnico)…"
        className={inputCls}
      />
      <button className="tap w-full rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white">
        Añadir observación
      </button>
    </form>
  );
}
