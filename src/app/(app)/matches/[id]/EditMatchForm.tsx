"use client";

import { useActionState, useState } from "react";
import { editMatchAction, type MatchFormState } from "../actions";
import type { Match } from "@/lib/types/database";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function EditMatchForm({
  match,
  defaultOpen = false,
}: {
  match: Match;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [state, formAction, pending] = useActionState<MatchFormState, FormData>(
    editMatchAction,
    {}
  );

  const inputCls =
    "w-full rounded-xl border border-separator bg-canvas px-3 py-2.5 text-sm text-label outline-none focus:border-brand";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="tap rounded-xl border border-separator px-4 py-3 text-sm text-label"
      >
        Editar
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2 rounded-2xl bg-surface p-3">
      <input type="hidden" name="matchId" value={match.id} />
      <input name="opponent" defaultValue={match.opponent} required className={inputCls} />
      <input
        name="date"
        type="datetime-local"
        defaultValue={toLocalInput(match.date)}
        required
        className={inputCls}
      />
      <input
        name="location"
        defaultValue={match.location ?? ""}
        placeholder="Lugar (opcional)"
        className={inputCls}
      />

      {/* Marcador y estado (para corregir partidos ya disputados) */}
      <div className="flex items-end gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-label-2">Nosotros</span>
          <input
            name="our_score"
            type="number"
            min={0}
            defaultValue={match.our_score}
            className={inputCls}
          />
        </label>
        <span className="pb-2.5 text-label-3">–</span>
        <label className="flex-1">
          <span className="mb-1 block text-xs text-label-2">Rival</span>
          <input
            name="opp_score"
            type="number"
            min={0}
            defaultValue={match.opp_score}
            className={inputCls}
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs text-label-2">Estado</span>
        <select name="status" defaultValue={match.status} className={inputCls}>
          <option value="scheduled">Programado</option>
          <option value="live">En vivo</option>
          <option value="finished">Finalizado</option>
        </select>
      </label>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary flex-1"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border border-separator px-3 py-2.5 text-sm text-label"
        >
          Cerrar
        </button>
      </div>
    </form>
  );
}
