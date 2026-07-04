"use client";

import { useActionState, useState } from "react";
import {
  editPlayerAction,
  deletePlayerAction,
  type PlayerFormState,
} from "./actions";
import type { Player } from "@/lib/types/database";

const POSITIONS = [
  "Portero",
  "Extremo izquierdo",
  "Lateral izquierdo",
  "Central",
  "Lateral derecho",
  "Extremo derecho",
  "Pivote",
];

export default function PlayerRow({
  player,
  teamId,
  canEdit,
}: {
  player: Player;
  teamId: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<PlayerFormState, FormData>(
    async (prev, fd) => {
      const res = await editPlayerAction(prev, fd);
      if (!res.error) setEditing(false);
      return res;
    },
    {}
  );

  if (editing) {
    return (
      <li className="rounded-2xl border border-brand/50 bg-slate-900 p-3">
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="playerId" value={player.id} />
          <input type="hidden" name="teamId" value={teamId} />
          <div className="flex gap-2">
            <input
              name="number"
              type="number"
              min={0}
              defaultValue={player.number ?? ""}
              placeholder="Nº"
              className="w-16 rounded-xl border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100 outline-none focus:border-brand"
            />
            <input
              name="name"
              defaultValue={player.name}
              required
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand"
            />
          </div>
          <select
            name="position"
            defaultValue={player.position ?? ""}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand"
          >
            <option value="">Posición (opcional)</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {state.error && <p className="text-sm text-red-400">{state.error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-brand">
        {player.number ?? "–"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-100">{player.name}</p>
        {player.position && (
          <p className="truncate text-xs text-slate-400">{player.position}</p>
        )}
      </div>
      {canEdit && (
        <>
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-brand"
          >
            Editar
          </button>
          <form action={deletePlayerAction}>
            <input type="hidden" name="playerId" value={player.id} />
            <input type="hidden" name="teamId" value={teamId} />
            <button
              type="submit"
              className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:text-red-400"
              aria-label={`Eliminar ${player.name}`}
            >
              ✕
            </button>
          </form>
        </>
      )}
    </li>
  );
}
