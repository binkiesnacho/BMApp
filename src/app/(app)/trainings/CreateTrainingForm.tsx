"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTrainingAction } from "./actions";
import CourtDrawer from "@/components/court/CourtDrawer";
import { DrawIcon } from "@/components/ui/icons";
import type {
  Team,
  TrainingBoard,
  TrainingDrawing,
  TrainingPhase,
} from "@/lib/types/database";

// Pizarra en edición: el dibujo puede estar vacío (null) hasta que se dibuje.
type EditBoard = { drawing: TrainingDrawing | null; description: string };
type EditPhase = { name: string; minutes: number; boards: EditBoard[] };

const DEFAULT_PHASES: EditPhase[] = [
  { name: "Calentamiento", minutes: 10, boards: [] },
  { name: "Parte principal", minutes: 60, boards: [] },
  { name: "Vuelta a la calma", minutes: 10, boards: [] },
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
  const [phases, setPhases] = useState<EditPhase[]>(DEFAULT_PHASES);
  const [objectives, setObjectives] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setPhase(i: number, patch: Partial<EditPhase>) {
    setPhases((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  }
  function addBoard(i: number) {
    setPhases((ps) =>
      ps.map((p, j) =>
        j === i
          ? { ...p, boards: [...p.boards, { drawing: null, description: "" }] }
          : p
      )
    );
  }
  function setBoard(i: number, k: number, patch: Partial<EditBoard>) {
    setPhases((ps) =>
      ps.map((p, j) =>
        j === i
          ? { ...p, boards: p.boards.map((b, m) => (m === k ? { ...b, ...patch } : b)) }
          : p
      )
    );
  }
  function removeBoard(i: number, k: number) {
    setPhases((ps) =>
      ps.map((p, j) =>
        j === i ? { ...p, boards: p.boards.filter((_, m) => m !== k) } : p
      )
    );
  }

  const total = phases.reduce((s, p) => s + (Number(p.minutes) || 0), 0);

  async function submit() {
    setError(null);
    setSaving(true);
    const phasesOut: TrainingPhase[] = phases.map((p) => {
      const boards: TrainingBoard[] = p.boards
        .filter(
          (b): b is { drawing: TrainingDrawing; description: string } =>
            !!b.drawing &&
            ((b.drawing.strokes?.length ?? 0) > 0 ||
              (b.drawing.tokens?.length ?? 0) > 0)
        )
        .map((b) => ({ drawing: b.drawing, description: b.description }));
      return { name: p.name, minutes: p.minutes, boards };
    });
    const res = await createTrainingAction({
      teamId,
      date,
      title,
      description,
      phases: phasesOut,
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
  const addRowCls =
    "flex w-full items-center gap-2 rounded-xl border border-dashed border-separator px-3 py-2.5 text-sm font-medium text-label-2 hover:border-brand hover:text-label";

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

      {/* Objetivos */}
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
          type="button"
          onClick={() => setObjectives((os) => [...os, ""])}
          className={addRowCls + " mt-2"}
        >
          <span className="text-base leading-none text-brand">＋</span> Añadir
          objetivo
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
          {phases.map((p, i) => (
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

              {/* Pizarras de la fase */}
              {p.boards.map((b, k) => (
                <div key={k} className="space-y-2 rounded-xl bg-canvas/60 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-label-3">
                      Pizarra {k + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBoard(i, k)}
                      className="text-[11px] text-label-3 hover:text-red-400"
                    >
                      Quitar
                    </button>
                  </div>
                  <CourtDrawer
                    value={b.drawing}
                    onChange={(d) => setBoard(i, k, { drawing: d })}
                  />
                  <input
                    value={b.description}
                    onChange={(e) => setBoard(i, k, { description: e.target.value })}
                    placeholder="Descripción del dibujo (opcional)"
                    className={inputCls}
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={() => addBoard(i)}
                className={addRowCls}
              >
                <DrawIcon size={16} /> Añadir pizarra
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setPhases((ps) => [...ps, { name: "", minutes: 0, boards: [] }])
          }
          className={addRowCls + " mt-2"}
        >
          <span className="text-base leading-none text-brand">＋</span> Añadir
          fase
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={saving}
          className="btn btn-primary flex-1"
        >
          {saving ? "Creando…" : "Crear entrenamiento"}
        </button>
        <button onClick={() => setOpen(false)} className="btn btn-ghost">
          Cancelar
        </button>
      </div>
    </div>
  );
}
