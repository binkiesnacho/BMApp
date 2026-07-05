"use client";

import { useActionState, useEffect, useRef } from "react";
import { addPlayerAction, type PlayerFormState } from "./actions";

const POSITIONS = [
  "Portero",
  "Extremo izquierdo",
  "Lateral izquierdo",
  "Central",
  "Lateral derecho",
  "Extremo derecho",
  "Pivote",
];

const initialState: PlayerFormState = {};

export default function AddPlayerForm({ teamId }: { teamId: string }) {
  const [state, formAction, pending] = useActionState(
    addPlayerAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-2 rounded-2xl border border-separator/60 bg-surface p-3"
    >
      <input type="hidden" name="teamId" value={teamId} />
      <div className="flex gap-2">
        <input
          name="number"
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Nº"
          className="w-16 rounded-xl border border-separator bg-canvas px-3 py-2.5 text-sm text-label outline-none focus:border-brand"
        />
        <input
          name="name"
          type="text"
          required
          placeholder="Nombre del jugador"
          className="flex-1 rounded-xl border border-separator bg-canvas px-3 py-2.5 text-sm text-label outline-none focus:border-brand"
        />
      </div>
      <select
        name="position"
        defaultValue=""
        className="w-full rounded-xl border border-separator bg-canvas px-3 py-2.5 text-sm text-label outline-none focus:border-brand"
      >
        <option value="">Posición (opcional)</option>
        {POSITIONS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Añadiendo…" : "Añadir jugador"}
      </button>
    </form>
  );
}
