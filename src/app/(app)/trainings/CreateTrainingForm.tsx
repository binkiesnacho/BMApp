"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTrainingAction } from "./actions";
import CourtDrawer from "@/components/court/CourtDrawer";
import { DrawIcon } from "@/components/ui/icons";
import {
  MAX_TRAINING_FILE_MB,
  TRAINING_FILE_ACCEPT,
  uploadTrainingFile,
} from "@/lib/trainingFiles";
import { OBJECTIVE_CATALOG, inferCategory } from "@/lib/objectives";
import type {
  Team,
  TrainingBoard,
  TrainingDrawing,
  TrainingExercise,
  TrainingPhase,
  TrainingProgression,
} from "@/lib/types/database";

// Estructuras en edición: el dibujo puede estar vacío (null) hasta que se dibuje.
type EditBoard = { drawing: TrainingDrawing | null };
type EditProgression = { description: string; boards: EditBoard[] };
type EditExercise = {
  name: string;
  description: string;
  boards: EditBoard[];
  progressions: EditProgression[];
};
type EditPhase = { name: string; minutes: number; exercises: EditExercise[] };

const DEFAULT_PHASES: EditPhase[] = [
  { name: "Calentamiento", minutes: 10, exercises: [] },
  { name: "Parte principal", minutes: 60, exercises: [] },
  { name: "Vuelta a la calma", minutes: 10, exercises: [] },
];

const emptyExercise = (): EditExercise => ({
  name: "",
  description: "",
  boards: [],
  progressions: [],
});
const emptyProgression = (): EditProgression => ({ description: "", boards: [] });

const INPUT_CLS =
  "w-full rounded-xl border border-separator bg-canvas px-3 py-2.5 text-sm text-label outline-none focus:border-brand";
const ADD_ROW_CLS =
  "flex w-full items-center gap-2 rounded-xl border border-dashed border-separator px-3 py-2.5 text-sm font-medium text-label-2 hover:border-brand hover:text-label";

/**
 * Bloque de pizarras (para ejercicios y progresiones). Definido a NIVEL DE
 * MÓDULO: si estuviera dentro del formulario, cada render lo recrearía y React
 * remontaría el CourtDrawer, perdiendo el dibujo (por eso la pizarra no
 * funcionaba en entrenamientos, solo en el modo pizarra suelto).
 */
function BoardList({
  boards,
  onAdd,
  onSet,
  onRemove,
}: {
  boards: EditBoard[];
  onAdd: () => void;
  onSet: (bi: number, d: TrainingDrawing | null) => void;
  onRemove: (bi: number) => void;
}) {
  return (
    <div className="space-y-2">
      {boards.map((b, bi) => (
        <div key={bi} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-label-3">Pizarra {bi + 1}</span>
            <button
              type="button"
              onClick={() => onRemove(bi)}
              className="text-[11px] text-label-3 hover:text-red-400"
            >
              Quitar
            </button>
          </div>
          <CourtDrawer value={b.drawing} onChange={(d) => onSet(bi, d)} />
        </div>
      ))}
      <button type="button" onClick={onAdd} className={ADD_ROW_CLS}>
        <DrawIcon size={16} /> Añadir pizarra
      </button>
    </div>
  );
}

export default function CreateTrainingForm({
  teams,
  defaultOpen = false,
}: {
  teams: Team[];
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const initialTeamId = teams.length === 1 ? teams[0].id : "";
  const [open, setOpen] = useState(defaultOpen);
  const [teamId, setTeamId] = useState(initialTeamId);
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [phases, setPhases] = useState<EditPhase[]>(DEFAULT_PHASES);
  const [objectives, setObjectives] = useState<string[]>([]);
  // La categoría (para las etiquetas) se deduce del equipo; el usuario la puede
  // cambiar. Al cambiar de equipo se vuelve a inferir.
  const [cat, setCat] = useState<string | null>(() =>
    inferCategory(teams.find((t) => t.id === initialTeamId)?.name)
  );

  function selectTeam(id: string) {
    setTeamId(id);
    setCat(inferCategory(teams.find((t) => t.id === id)?.name));
  }
  const [customObj, setCustomObj] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCat = OBJECTIVE_CATALOG.find((c) => c.category === cat) ?? null;
  function toggleObjective(item: string) {
    setObjectives((os) =>
      os.includes(item) ? os.filter((o) => o !== item) : [...os, item]
    );
  }
  function addCustomObjective() {
    const v = customObj.trim();
    if (!v) return;
    setObjectives((os) => (os.includes(v) ? os : [...os, v]));
    setCustomObj("");
  }

  /* ----- Actualizaciones anidadas (fase → ejercicio → progresión → pizarra) ----- */
  function updatePhase(i: number, fn: (p: EditPhase) => EditPhase) {
    setPhases((ps) => ps.map((p, j) => (j === i ? fn(p) : p)));
  }
  function setPhase(i: number, patch: Partial<EditPhase>) {
    updatePhase(i, (p) => ({ ...p, ...patch }));
  }
  function updateExercise(i: number, ei: number, fn: (e: EditExercise) => EditExercise) {
    updatePhase(i, (p) => ({
      ...p,
      exercises: p.exercises.map((e, k) => (k === ei ? fn(e) : e)),
    }));
  }
  function updateProgression(
    i: number,
    ei: number,
    pi: number,
    fn: (pr: EditProgression) => EditProgression
  ) {
    updateExercise(i, ei, (e) => ({
      ...e,
      progressions: e.progressions.map((pr, m) => (m === pi ? fn(pr) : pr)),
    }));
  }

  const total = phases.reduce((s, p) => s + (Number(p.minutes) || 0), 0);

  async function submit() {
    setError(null);
    setSaving(true);

    const boardsOut = (bs: EditBoard[]): TrainingBoard[] =>
      bs.filter((b) => b.drawing).map((b) => ({ drawing: b.drawing as TrainingDrawing }));

    const phasesOut: TrainingPhase[] = phases.map((p) => {
      const exercises: TrainingExercise[] = p.exercises.map((e) => {
        const progressions: TrainingProgression[] = e.progressions.map((pr) => ({
          description: pr.description,
          boards: boardsOut(pr.boards),
        }));
        return {
          name: e.name,
          description: e.description,
          boards: boardsOut(e.boards),
          progressions,
        };
      });
      return { name: p.name, minutes: p.minutes, exercises };
    });

    const res = await createTrainingAction({
      teamId,
      date,
      title,
      description,
      phases: phasesOut,
      objectives,
    });
    if (res.error || !res.id) {
      setSaving(false);
      setError(res.error ?? "No se pudo crear.");
      return;
    }

    // El entrenamiento ya existe: subimos los adjuntos pero NUNCA bloqueamos la
    // navegación por ello (si un adjunto falla o lanza, igualmente continuamos;
    // así el botón no se queda en "Creando…").
    for (const f of files) {
      try {
        await uploadTrainingFile(res.id, f);
      } catch {
        /* el entreno ya está creado; el adjunto se puede reintentar luego */
      }
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

  const inputCls = INPUT_CLS;
  const addRowCls = ADD_ROW_CLS;

  return (
    <div className="space-y-3 rounded-2xl border border-separator/60 bg-surface p-3">
      <select value={teamId} onChange={(e) => selectTeam(e.target.value)} className={inputCls}>
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

      {/* Objetivos técnico-tácticos: etiquetas por categoría + personalizados */}
      <div>
        <p className="mb-1 text-xs font-semibold text-label-2">
          Objetivos técnico-tácticos
        </p>

        {/* Categoría (los objetivos no dependen del género) */}
        <div className="no-scrollbar -mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1">
          {OBJECTIVE_CATALOG.map((c) => {
            const on = cat === c.category;
            return (
              <button
                key={c.category}
                type="button"
                onClick={() => setCat(on ? null : c.category)}
                className={`min-h-[34px] shrink-0 rounded-full px-3.5 text-[13px] font-medium transition active:scale-95 ${
                  on ? "bg-brand text-white" : "bg-canvas text-label-2"
                }`}
              >
                {c.category}
              </button>
            );
          })}
        </div>

        {/* Catálogo de la categoría elegida */}
        {activeCat &&
          activeCat.groups.map((g) => (
            <div key={g.label} className="mb-2">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-label-3">
                {g.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((it) => {
                  const on = objectives.includes(it);
                  return (
                    <button
                      key={it}
                      type="button"
                      onClick={() => toggleObjective(it)}
                      aria-pressed={on}
                      className={`min-h-[32px] rounded-full border px-3 text-[12px] font-medium transition active:scale-95 ${
                        on
                          ? "border-brand bg-brand/20 text-sky-100"
                          : "border-separator bg-canvas text-label-2"
                      }`}
                    >
                      {on ? "✓ " : "+ "}
                      {it}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

        {/* Objetivos seleccionados (de cualquier categoría + personalizados) */}
        {objectives.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 rounded-xl bg-canvas p-2">
            {objectives.map((o, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-[12px] font-medium text-white"
              >
                {o}
                <button
                  type="button"
                  onClick={() => setObjectives((os) => os.filter((_, j) => j !== i))}
                  className="text-[13px] leading-none opacity-80"
                  aria-label={`Quitar ${o}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Objetivo personalizado */}
        <div className="mt-2 flex gap-2">
          <input
            value={customObj}
            onChange={(e) => setCustomObj(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomObjective();
              }
            }}
            placeholder="Objetivo personalizado"
            className={inputCls + " flex-1"}
          />
          <button
            type="button"
            onClick={addCustomObjective}
            disabled={!customObj.trim()}
            className="rounded-xl border border-separator px-3 text-sm font-medium text-label disabled:opacity-40"
          >
            Añadir
          </button>
        </div>
      </div>

      <textarea
        placeholder="Descripción general (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className={inputCls}
      />

      {/* Fases con sus ejercicios */}
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
                  placeholder="Fase (p. ej. Parte principal)"
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

              {/* Ejercicios de la fase */}
              {p.exercises.map((ex, ei) => (
                <div key={ei} className="space-y-2 rounded-xl bg-canvas/60 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-sky-200">
                      Ejercicio {ei + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updatePhase(i, (ph) => ({
                          ...ph,
                          exercises: ph.exercises.filter((_, k) => k !== ei),
                        }))
                      }
                      className="text-[11px] text-label-3 hover:text-red-400"
                    >
                      Quitar
                    </button>
                  </div>

                  {/* Explicación PRIMERO */}
                  <input
                    value={ex.name}
                    onChange={(e) => updateExercise(i, ei, (x) => ({ ...x, name: e.target.value }))}
                    placeholder="Nombre del ejercicio (opcional)"
                    className={inputCls}
                  />
                  <textarea
                    value={ex.description}
                    onChange={(e) =>
                      updateExercise(i, ei, (x) => ({ ...x, description: e.target.value }))
                    }
                    placeholder="Explicación / descripción del ejercicio"
                    rows={2}
                    className={inputCls}
                  />

                  {/* …y LUEGO las pizarras */}
                  <BoardList
                    boards={ex.boards}
                    onAdd={() => updateExercise(i, ei, (x) => ({ ...x, boards: [...x.boards, { drawing: null }] }))}
                    onSet={(bi, d) =>
                      updateExercise(i, ei, (x) => ({
                        ...x,
                        boards: x.boards.map((b, m) => (m === bi ? { drawing: d } : b)),
                      }))
                    }
                    onRemove={(bi) =>
                      updateExercise(i, ei, (x) => ({
                        ...x,
                        boards: x.boards.filter((_, m) => m !== bi),
                      }))
                    }
                  />

                  {/* Progresiones (variantes / complicaciones) */}
                  {ex.progressions.map((pr, pi) => (
                    <div
                      key={pi}
                      className="space-y-2 rounded-lg border border-separator/70 p-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-label-2">
                          Progresión {pi + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateExercise(i, ei, (x) => ({
                              ...x,
                              progressions: x.progressions.filter((_, m) => m !== pi),
                            }))
                          }
                          className="text-[11px] text-label-3 hover:text-red-400"
                        >
                          Quitar
                        </button>
                      </div>
                      <textarea
                        value={pr.description}
                        onChange={(e) =>
                          updateProgression(i, ei, pi, (x) => ({ ...x, description: e.target.value }))
                        }
                        placeholder="En qué cambia respecto al ejercicio base"
                        rows={2}
                        className={inputCls}
                      />
                      <BoardList
                        boards={pr.boards}
                        onAdd={() =>
                          updateProgression(i, ei, pi, (x) => ({
                            ...x,
                            boards: [...x.boards, { drawing: null }],
                          }))
                        }
                        onSet={(bi, d) =>
                          updateProgression(i, ei, pi, (x) => ({
                            ...x,
                            boards: x.boards.map((b, m) => (m === bi ? { drawing: d } : b)),
                          }))
                        }
                        onRemove={(bi) =>
                          updateProgression(i, ei, pi, (x) => ({
                            ...x,
                            boards: x.boards.filter((_, m) => m !== bi),
                          }))
                        }
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      updateExercise(i, ei, (x) => ({
                        ...x,
                        progressions: [...x.progressions, emptyProgression()],
                      }))
                    }
                    className="flex w-full items-center gap-2 rounded-lg border border-dashed border-separator px-3 py-2 text-[13px] font-medium text-label-3 hover:border-brand hover:text-label"
                  >
                    <span className="text-base leading-none text-brand">＋</span> Añadir progresión
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  updatePhase(i, (ph) => ({ ...ph, exercises: [...ph.exercises, emptyExercise()] }))
                }
                className={addRowCls}
              >
                <span className="text-base leading-none text-brand">＋</span> Añadir ejercicio
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPhases((ps) => [...ps, { name: "", minutes: 0, exercises: [] }])}
          className={addRowCls + " mt-2"}
        >
          <span className="text-base leading-none text-brand">＋</span> Añadir fase
        </button>
      </div>

      {/* Adjuntos: PDF o imagen (el entreno completo en papel/foto) */}
      <div>
        <p className="mb-1 text-xs font-semibold text-label-2">Adjuntos (PDF o imagen)</p>
        {files.length > 0 && (
          <ul className="mb-2 space-y-1">
            {files.map((f, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-lg bg-canvas px-3 py-2 text-[13px]"
              >
                <span>{f.type.startsWith("image/") ? "🖼️" : "📄"}</span>
                <span className="min-w-0 flex-1 truncate text-label">{f.name}</span>
                <button
                  type="button"
                  onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                  className="text-label-3 hover:text-red-400"
                  aria-label="Quitar adjunto"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <label className={addRowCls + " cursor-pointer justify-center"}>
          <span className="text-base leading-none text-brand">＋</span> Añadir PDF o foto
          <input
            type="file"
            accept={TRAINING_FILE_ACCEPT}
            multiple
            onChange={(e) => {
              const list = Array.from(e.target.files ?? []);
              e.target.value = "";
              setFiles((fs) => [...fs, ...list]);
            }}
            className="hidden"
          />
        </label>
        <p className="mt-1 text-[11px] text-label-3">
          Fotos o PDFs, hasta {MAX_TRAINING_FILE_MB} MB. Solo los ve tu equipo.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving} className="btn btn-primary flex-1">
          {saving ? "Creando…" : "Crear entrenamiento"}
        </button>
        <button onClick={() => setOpen(false)} className="btn btn-ghost">
          Cancelar
        </button>
      </div>
    </div>
  );
}
