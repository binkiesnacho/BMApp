"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createMatchAction, type MatchFormState } from "./actions";
import type { Team } from "@/lib/types/database";

export default function CreateMatchForm({
  teams,
  defaultOpen = false,
}: {
  teams: Team[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [state, formAction, pending] = useActionState<MatchFormState, FormData>(
    createMatchAction,
    {}
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error && !defaultOpen && formRef.current) {
      formRef.current.reset();
      setOpen(false);
    }
  }, [pending, state, defaultOpen]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-dashed border-separator py-3 text-sm font-medium text-label hover:border-brand"
      >
        + Nuevo partido
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-2 rounded-2xl border border-separator/60 bg-surface p-3"
    >
      <select
        name="teamId"
        required
        defaultValue={teams.length === 1 ? teams[0].id : ""}
        className="w-full rounded-xl border border-separator bg-canvas px-3 py-2.5 text-sm text-label outline-none focus:border-brand"
      >
        <option value="">Equipo…</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <input
        name="opponent"
        required
        placeholder="Rival"
        className="w-full rounded-xl border border-separator bg-canvas px-3 py-2.5 text-sm text-label outline-none focus:border-brand"
      />
      <input
        name="date"
        type="datetime-local"
        required
        className="w-full rounded-xl border border-separator bg-canvas px-3 py-2.5 text-sm text-label outline-none focus:border-brand"
      />
      <input
        name="location"
        placeholder="Lugar (opcional)"
        className="w-full rounded-xl border border-separator bg-canvas px-3 py-2.5 text-sm text-label outline-none focus:border-brand"
      />
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary flex-1"
        >
          {pending ? "Creando…" : "Crear partido"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn btn-ghost"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
