"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTeamAction, type TeamFormState } from "./actions";

const initialState: TeamFormState = {};

export default function CreateTeamForm() {
  const [state, formAction, pending] = useActionState(
    createTeamAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Limpia el input tras una creación correcta (sin error).
  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="flex gap-2">
      <input
        name="name"
        type="text"
        required
        placeholder="Nuevo equipo (ej. Senior Masculino)"
        className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-brand"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "…" : "Añadir"}
      </button>
      {state.error && (
        <p className="w-full text-sm text-red-400">{state.error}</p>
      )}
    </form>
  );
}
