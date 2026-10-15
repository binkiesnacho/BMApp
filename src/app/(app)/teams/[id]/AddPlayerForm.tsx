"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addPlayerAction, type PlayerFormState } from "./actions";
import PositionChips from "./PositionChips";

const initialState: PlayerFormState = {};

export default function AddPlayerForm({ teamId }: { teamId: string }) {
  const [state, formAction, pending] = useActionState(
    addPlayerAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);
  // Al añadir con éxito, remonta los chips para limpiar la selección.
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (!pending && !state.error) {
      formRef.current?.reset();
      setResetKey((k) => k + 1);
    }
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
      <div>
        <p className="mb-1.5 text-[12px] text-label-3">Posiciones (opcional)</p>
        <PositionChips key={resetKey} />
      </div>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full btn btn-primary"
      >
        {pending ? "Añadiendo…" : "Añadir jugador"}
      </button>
    </form>
  );
}
