"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAttendanceAction } from "../actions";
import type { Player } from "@/lib/types/database";

function fmtStamp(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Sesión de entrenamiento: se pulsa "Comenzar entrenamiento" y se marca quién
 * ha faltado. Al guardar queda registrada la hora exacta y quién pasó lista,
 * consultable después por otros entrenadores y administradores.
 */
export default function AttendanceEditor({
  trainingId,
  players,
  initialAttended,
  takenAt,
  takenBy,
}: {
  trainingId: string;
  players: Player[];
  initialAttended: string[];
  takenAt: string | null;
  takenBy: string | null;
}) {
  const router = useRouter();
  // Si ya se pasó lista, se muestra directamente la lista para revisarla.
  const [started, setStarted] = useState(Boolean(takenAt));
  // Por defecto todos presentes: se marcan solo las ausencias, que es lo raro.
  const [attended, setAttended] = useState<Set<string>>(() =>
    takenAt ? new Set(initialAttended) : new Set(players.map((p) => p.id))
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function toggle(id: string) {
    setMsg(null);
    setAttended((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setErr(null);
    setMsg(null);
    const res = await saveAttendanceAction(trainingId, [...attended]);
    setSaving(false);
    if (res.error) setErr(res.error);
    else {
      setMsg("Faltas guardadas ✓");
      router.refresh();
    }
  }

  if (!started) {
    return (
      <div>
        <p className="mb-3 text-[13px] text-label-2">
          Al comenzar, marca quién no ha venido. Se guardará la hora exacta.
        </p>
        <button
          onClick={() => setStarted(true)}
          disabled={players.length === 0}
          className="btn btn-primary w-full py-3.5 disabled:opacity-50"
        >
          ▶ Comenzar entrenamiento
        </button>
        {players.length === 0 && (
          <p className="mt-2 text-center text-[12px] text-label-3">
            La plantilla está vacía.
          </p>
        )}
      </div>
    );
  }

  const absent = players.length - attended.size;

  return (
    <div className="space-y-2">
      {takenAt && (
        <p className="rounded-xl bg-canvas px-3 py-2 text-[12px] text-label-3">
          Lista pasada el <span className="text-label-2">{fmtStamp(takenAt)}</span>
          {takenBy && <> · por <span className="text-label-2">{takenBy}</span></>}
        </p>
      )}
      <div className="flex items-center justify-between text-xs text-label-2">
        <span>Desmarca a quien haya faltado</span>
        <span>
          {attended.size} presentes ·{" "}
          <span className={absent > 0 ? "font-semibold text-red-400" : ""}>
            {absent} {absent === 1 ? "falta" : "faltas"}
          </span>
        </span>
      </div>
      <ul className="space-y-1.5">
        {players.map((p) => {
          const on = attended.has(p.id);
          return (
            <li key={p.id}>
              <button
                onClick={() => toggle(p.id)}
                aria-pressed={on}
                className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl border px-3 text-left text-sm transition active:scale-[0.99] ${
                  on
                    ? "border-emerald-600/60 bg-emerald-950/40"
                    : "border-red-500/50 bg-red-950/30"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    on ? "bg-emerald-600 text-white" : "bg-red-500 text-white"
                  }`}
                >
                  {on ? "✓" : "✕"}
                </span>
                <span className="w-7 shrink-0 text-center font-bold text-brand">
                  {p.number ?? "–"}
                </span>
                <span className="flex-1 truncate text-label">{p.name}</span>
                {!on && <span className="text-xs font-semibold text-red-400">Falta</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {err && <p className="text-center text-sm text-negative">{err}</p>}
      {msg && <p className="text-center text-sm text-emerald-400">{msg}</p>}
      <button
        onClick={save}
        disabled={saving || players.length === 0}
        className="btn btn-primary w-full py-3.5"
      >
        {saving ? "Guardando…" : takenAt ? "Actualizar faltas" : "Guardar faltas"}
      </button>
    </div>
  );
}
