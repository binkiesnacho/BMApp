"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAttendanceAction } from "../actions";
import type { Player } from "@/lib/types/database";

export default function AttendanceEditor({
  trainingId,
  players,
  initialAttended,
}: {
  trainingId: string;
  players: Player[];
  initialAttended: string[];
}) {
  const router = useRouter();
  const [attended, setAttended] = useState<Set<string>>(
    new Set(initialAttended)
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(id: string) {
    setAttended((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await saveAttendanceAction(trainingId, [...attended]);
    setSaving(false);
    if (res.error) setMsg(res.error);
    else {
      setMsg("Asistencia guardada ✓");
      router.refresh();
    }
  }

  const absent = players.length - attended.size;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-label-2">
        <span>Marca quién asistió</span>
        <span>
          {attended.size} presentes · {absent} faltas
        </span>
      </div>
      <ul className="space-y-1.5">
        {players.map((p) => {
          const on = attended.has(p.id);
          return (
            <li key={p.id}>
              <button
                onClick={() => toggle(p.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm ${
                  on
                    ? "border-emerald-600/60 bg-emerald-950/40"
                    : "border-separator/60 bg-canvas"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    on ? "bg-emerald-600 text-white" : "bg-surface-2 text-label"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
                <span className="font-bold text-brand">{p.number ?? "–"}</span>
                <span className="flex-1 truncate text-label">{p.name}</span>
                {!on && (
                  <span className="text-xs font-semibold text-red-400">Falta</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {msg && <p className="text-center text-sm text-emerald-400">{msg}</p>}
      <button
        onClick={save}
        disabled={saving || players.length === 0}
        className="btn btn-primary w-full py-3.5"
      >
        {saving ? "Guardando…" : "Guardar asistencia"}
      </button>
    </div>
  );
}
