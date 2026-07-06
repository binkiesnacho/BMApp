"use client";

import { useActionState, useState } from "react";
import {
  createClubAction,
  joinClubAction,
  type OnboardingState,
} from "./actions";

const initialState: OnboardingState = {};
type Mode = "create" | "join";

export default function ClubForm({ canCreate = false }: { canCreate?: boolean }) {
  // Quien no puede crear clubs (no super-admin) solo ve la opción de unirse.
  const [mode, setMode] = useState<Mode>(canCreate ? "create" : "join");
  const [createState, createAction, creating] = useActionState(
    createClubAction,
    initialState
  );
  const [joinState, joinAction, joining] = useActionState(
    joinClubAction,
    initialState
  );

  return (
    <div className="w-full max-w-xs space-y-4">
      {canCreate && (
        <div className="flex rounded-xl border border-separator/60 p-1 text-sm">
          <button
            onClick={() => setMode("create")}
            className={`flex-1 rounded-lg py-2 ${
              mode === "create" ? "bg-brand text-white" : "text-label-2"
            }`}
          >
            Crear club
          </button>
          <button
            onClick={() => setMode("join")}
            className={`flex-1 rounded-lg py-2 ${
              mode === "join" ? "bg-brand text-white" : "text-label-2"
            }`}
          >
            Unirme con código
          </button>
        </div>
      )}

      {canCreate && mode === "create" ? (
        <form action={createAction} className="space-y-3">
          <input
            name="clubName"
            type="text"
            required
            placeholder="Nombre del club (ej. CB Villanueva)"
            className="w-full rounded-xl border border-separator bg-surface px-4 py-3 text-label outline-none focus:border-brand"
          />
          {createState.error && (
            <p className="text-sm text-red-400">{createState.error}</p>
          )}
          <button
            type="submit"
            disabled={creating}
            className="w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {creating ? "Creando…" : "Crear club (seré admin)"}
          </button>
        </form>
      ) : (
        <form action={joinAction} className="space-y-3">
          <input
            name="code"
            type="text"
            required
            autoCapitalize="characters"
            placeholder="Código de invitación (ej. A1B2C3)"
            className="w-full rounded-xl border border-separator bg-surface px-4 py-3 uppercase tracking-widest text-label outline-none focus:border-brand"
          />
          {joinState.error && (
            <p className="text-sm text-red-400">{joinState.error}</p>
          )}
          <button
            type="submit"
            disabled={joining}
            className="w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {joining ? "Uniéndome…" : "Unirme al club"}
          </button>
          <p className="text-center text-xs text-label-3">
            Tu rol lo define la invitación que te dé tu administrador.
          </p>
        </form>
      )}
    </div>
  );
}
