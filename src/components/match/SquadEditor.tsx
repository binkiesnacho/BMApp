"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSquadAction } from "@/app/(app)/matches/actions";
import type { Player } from "@/lib/types/database";

/**
 * Convocatoria de un partido: se marca quién está citado y se guarda con
 * antelación. En el modo en vivo aparecen solo los convocados.
 */
export default function SquadEditor({
  matchId,
  players,
  initial,
}: {
  matchId: string;
  players: Player[];
  initial: string[];
}) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(() => new Set(initial));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const dirty =
    sel.size !== initial.length || initial.some((id) => !sel.has(id));

  function toggle(id: string) {
    setMsg(null);
    setSel((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    setErr(null);
    setMsg(null);
    start(async () => {
      const res = await saveSquadAction(matchId, [...sel]);
      if (res.error) setErr(res.error);
      else {
        setMsg("Convocatoria guardada ✓");
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="ios-section-caption">Convocatoria</span>
        <span className="text-[12px] text-label-3">{sel.size} citados</span>
      </div>

      <ul className="space-y-1.5">
        {players.map((p) => {
          const on = sel.has(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => toggle(p.id)}
                aria-pressed={on}
                className={`flex min-h-[48px] w-full items-center gap-3 rounded-2xl border px-3 text-left transition active:scale-[0.99] ${
                  on ? "border-brand bg-brand/15" : "border-separator bg-surface"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[12px] font-bold ${
                    on ? "border-brand bg-brand text-white" : "border-separator text-label-3"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
                <span className="w-7 shrink-0 text-center font-bold text-brand">
                  {p.number ?? "–"}
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] text-label">
                  {p.name}
                </span>
                {p.position && (
                  <span className="shrink-0 text-[11px] text-label-3">{p.position}</span>
                )}
              </button>
            </li>
          );
        })}
        {players.length === 0 && (
          <li className="rounded-2xl border border-dashed border-separator/70 p-4 text-center text-[13px] text-label-3">
            La plantilla está vacía.
          </li>
        )}
      </ul>

      {err && <p className="mt-2 text-[13px] text-negative">{err}</p>}
      {msg && <p className="mt-2 text-[13px] text-emerald-400">{msg}</p>}

      <button
        type="button"
        onClick={save}
        disabled={pending || !dirty}
        className="btn btn-secondary mt-3 w-full py-3.5 disabled:opacity-50"
      >
        {pending ? "Guardando…" : dirty ? "Guardar convocatoria" : "Convocatoria guardada"}
      </button>
    </div>
  );
}
