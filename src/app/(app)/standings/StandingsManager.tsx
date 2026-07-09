"use client";

import { useActionState, useState } from "react";
import {
  addStandingsRowAction,
  editStandingsRowAction,
  deleteStandingsRowAction,
  type StandingsFormState,
} from "./actions";
import type { StandingsRow } from "@/lib/types/database";

const NUM_FIELDS: { key: keyof StandingsRow; label: string }[] = [
  { key: "played", label: "PJ" },
  { key: "won", label: "G" },
  { key: "drawn", label: "E" },
  { key: "lost", label: "P" },
  { key: "gf", label: "GF" },
  { key: "ga", label: "GC" },
];

function NumberGrid({ row }: { row?: StandingsRow }) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {NUM_FIELDS.map((f) => (
        <label key={f.key} className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-label-3">{f.label}</span>
          <input
            name={f.key}
            type="number"
            min={0}
            defaultValue={row ? (row[f.key] as number) : 0}
            className="w-full rounded-lg border border-separator bg-canvas px-1 py-1.5 text-center text-[13px] text-label outline-none focus:border-brand"
          />
        </label>
      ))}
    </div>
  );
}

function AddForm({ teamId }: { teamId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<StandingsFormState, FormData>(
    async (prev, fd) => {
      const res = await addStandingsRowAction(prev, fd);
      if (!res.error) setOpen(false);
      return res;
    },
    {}
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="tap w-full rounded-xl border border-dashed border-separator px-3 py-2.5 text-[14px] font-medium text-brand"
      >
        + Añadir rival
      </button>
    );
  }

  return (
    <form action={action} className="space-y-2 rounded-2xl border border-brand/50 bg-surface p-3">
      <input type="hidden" name="teamId" value={teamId} />
      <input
        name="name"
        required
        placeholder="Nombre del rival"
        className="w-full rounded-xl border border-separator bg-canvas px-3 py-2 text-sm text-label outline-none focus:border-brand"
      />
      <NumberGrid />
      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary flex-1"
        >
          {pending ? "Guardando…" : "Añadir"}
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

function RivalRow({ row }: { row: StandingsRow }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<StandingsFormState, FormData>(
    async (prev, fd) => {
      const res = await editStandingsRowAction(prev, fd);
      if (!res.error) setEditing(false);
      return res;
    },
    {}
  );

  if (editing) {
    return (
      <form action={action} className="space-y-2 rounded-2xl border border-brand/50 bg-surface p-3">
        <input type="hidden" name="rowId" value={row.id} />
        <input
          name="name"
          required
          defaultValue={row.name}
          className="w-full rounded-xl border border-separator bg-canvas px-3 py-2 text-sm text-label outline-none focus:border-brand"
        />
        <NumberGrid row={row} />
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
            onClick={() => setEditing(false)}
            className="btn btn-ghost"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl bg-surface px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-[14px] font-medium text-label">{row.name}</p>
        <p className="text-[12px] text-label-3">
          {row.played} PJ · {row.won}-{row.drawn}-{row.lost} · {row.gf}:{row.ga}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg px-2 py-1 text-xs text-label-2 hover:text-brand"
        >
          Editar
        </button>
        <form action={deleteStandingsRowAction}>
          <input type="hidden" name="rowId" value={row.id} />
          <button
            type="submit"
            className="rounded-lg px-2 py-1 text-xs text-label-3 hover:text-negative"
            aria-label={`Eliminar ${row.name}`}
          >
            ✕
          </button>
        </form>
      </div>
    </div>
  );
}

/** Gestión de las filas de rivales de la clasificación (solo cuerpo técnico). */
export default function StandingsManager({
  teamId,
  rows,
}: {
  teamId: string;
  rows: StandingsRow[];
}) {
  return (
    <div className="mt-6">
      <p className="ios-section-caption mb-1.5 px-1">Rivales (edición)</p>
      <div className="space-y-2">
        {rows.map((r) => (
          <RivalRow key={r.id} row={r} />
        ))}
        <AddForm teamId={teamId} />
      </div>
      <p className="mt-2 px-1 text-[12px] text-label-3">
        Introduce aquí los datos de los rivales para completar la tabla. Tu fila
        se calcula sola con los partidos finalizados.
      </p>
    </div>
  );
}
