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

export default function EditMatchForm({ match }: { match: Match }) {
  const [open, setOpen] = useState(false);
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
      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
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
