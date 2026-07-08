"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTrainingAction } from "./actions";
import CourtDrawer from "@/components/court/CourtDrawer";
import type { Team, TrainingPhase } from "@/lib/types/database";

const DEFAULT_PHASES: TrainingPhase[] = [
  { name: "Calentamiento", minutes: 10 },
  { name: "Parte principal", minutes: 60 },
  { name: "Vuelta a la calma", minutes: 10 },
];

export default function CreateTrainingForm({
  teams,
  defaultOpen = false,
}: {
  teams: Team[];
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [teamId, setTeamId] = useState(teams.length === 1 ? teams[0].id : "");
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [phases, setPhases] = useState<TrainingPhase[]>(DEFAULT_PHASES);
  const [objectives, setObjectives] = useState<string[]>([""]);
  const [openDrawer, setOpenDrawer] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setPhase(i: number, patch: Partial<TrainingPhase>) {
    setPhases((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  }

  const total = phases.reduce((s, p) => s + (Number(p.minutes) || 0), 0);

  async function submit() {
    setError(null);
    setSaving(true);
    const res = await createTrainingAction({
      teamId,
      date,
      title,
      description,
      phases,
      objectives,
    });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.push(`/trainings/${res.id}`);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-dashed border-separator py-3 text-sm font-medium text-label hover:border-brand"
      >
        + Nuevo entrenamiento
      </button>
    );
  }

  const inputCls =
    "w-full rounded-xl border border-separator bg-canvas px-3 py-2.5 text-sm text-label outline-none focus:border-brand";

  return (
    <div className="space-y-3 rounded-2xl border border-separator/60 bg-surface p-3">
      <select
        value={teamId}
        onChange={(e) => setTeamId(e.target.value)}
        className={inputCls}
      >
        <option value="">Equipo…</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <input
        type="datetime-local"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className={inputCls}
      />
      <input
        placeholder="Título (opcional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={inputCls}
      />

      {/* Objetivos (debajo del título, encima de la descripción) */}
      <div>
        <p className="mb-1 text-xs font-semibold text-label-2">Objetivos</p>
        <div className="space-y-2">
          {objectives.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={o}
                onChange={(e) =>
                  setObjectives((os) =>
                    os.map((x, j) => (j === i ? e.target.value : x))
                  )
                }
                placeholder={`Objetivo ${i + 1}`}
                className={inputCls + " flex-1"}
              />
              <button
                onClick={() =>
                  setObjectives((os) => os.filter((_, j) => j !== i))
                }
                className="px-2 text-label-3 hover:text-red-400"
                aria-label="Quitar objetivo"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setObjectives((os) => [...os, ""])}
          className="mt-2 text-xs text-brand"
        >
          + Añadir objetivo
        </button>
      </div>

      <textarea
        placeholder="Descripción (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className={inputCls}
      />

      {/* Fases */}
      <div>
        <p className="mb-1 text-xs font-semibold text-label-2">
          Fases · {total}&apos; total
        </p>
        <div className="space-y-2">
          {phases.map((p, i) => {
            const hasDrawing = (p.drawing?.strokes.length ?? 0) > 0;
            return (
              <div key={i} className="space-y-2 rounded-xl border border-separator/60 p-2">
                <div className="flex gap-2">
                  <input
                    value={p.name}
                    onChange={(e) => setPhase(i, { name: e.target.value })}
                    placeholder="Ejercicio / fase"
                    className={inputCls + " flex-1"}
                  />
                  <input
                    type="number"
                    min={0}
                    value={p.minutes}
                    onChange={(e) => setPhase(i, { minutes: Number(e.target.value) })}
                    className="w-16 rounded-xl border border-separator bg-canvas px-2 py-2.5 text-sm text-label outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={() => setPhases((ps) => ps.filter((_, j) => j !== i))}
                    className="px-2 text-label-3 hover:text-red-400"
                    aria-label="Quitar fase"
                  >
                    ✕
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenDrawer(openDrawer === i ? null : i)}
                  className="text-xs text-brand"
                >
                  🎨 {hasDrawing ? "Editar pizarra" : "Añadir pizarra"}
                  {hasDrawing && (
                    <span className="ml-1 text-label-3">· con esquema</span>
                  )}
                </button>
                {openDrawer === i && (
                  <CourtDrawer
                    value={p.drawing ?? null}
                    onChange={(d) => setPhase(i, { drawing: d })}
                  />
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={() => setPhases((ps) => [...ps, { name: "", minutes: 0 }])}
          className="mt-2 text-xs text-brand"
        >
          + Añadir fase
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={saving}
          className="flex-1 rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Creando…" : "Crear entrenamiento"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-xl border border-separator px-3 py-2.5 text-sm text-label"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
