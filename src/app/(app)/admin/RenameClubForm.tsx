"use client";

import { useActionState } from "react";
import { renameClubAction, type AdminFormState } from "./actions";

export default function RenameClubForm({
  currentName,
}: {
  currentName: string;
}) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    renameClubAction,
    {}
  );

  return (
    <form action={formAction} className="flex gap-2">
      <input
        name="name"
        type="text"
        required
        defaultValue={currentName}
        className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-brand"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "…" : "Guardar"}
      </button>
      {state.error && <p className="w-full text-sm text-red-400">{state.error}</p>}
      {state.ok && (
        <p className="w-full text-sm text-emerald-400">Guardado ✓</p>
      )}
    </form>
  );
}
