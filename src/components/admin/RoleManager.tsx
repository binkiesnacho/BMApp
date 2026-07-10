"use client";

import { useState } from "react";
import {
  addMemberRoleAction,
  removeMemberRoleAction,
} from "@/app/(app)/admin/actions";
import type { UserRole } from "@/lib/types/database";

const LABEL: Record<UserRole, string> = {
  admin: "Admin",
  coach: "Entrenador",
  tecnico: "Técnico",
  player: "Jugador",
};

const ALL: UserRole[] = ["admin", "coach", "tecnico", "player"];

/**
 * Gestión compacta de roles de un miembro: los roles actuales se muestran como
 * chips con ✕ para quitarlos y un botón "Añadir rol" despliega los que faltan.
 * `lockAdmin` impide que un admin se quite a sí mismo el rol de administrador.
 */
export default function RoleManager({
  memberId,
  current,
  lockAdmin = false,
}: {
  memberId: string;
  current: UserRole[];
  lockAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const addable = ALL.filter((r) => !current.includes(r));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {current.length === 0 && (
          <span className="text-[13px] text-label-3">Sin roles asignados.</span>
        )}
        {current.map((r) => {
          const locked = lockAdmin && r === "admin";
          return (
            <form key={r} action={removeMemberRoleAction}>
              <input type="hidden" name="memberId" value={memberId} />
              <input type="hidden" name="role" value={r} />
              <button
                disabled={locked}
                aria-label={`Quitar rol ${LABEL[r]}`}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-brand px-4 text-[13px] font-medium text-white transition active:scale-95 disabled:opacity-50"
              >
                {LABEL[r]}
                {!locked && <span className="text-[15px] leading-none opacity-80">✕</span>}
              </button>
            </form>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex min-h-[38px] items-center gap-1 rounded-full border border-dashed border-separator px-4 text-[13px] font-medium text-label-2 transition active:scale-95"
        >
          <span className="text-[15px] leading-none">＋</span> Añadir rol
        </button>
      </div>

      {open && (
        <div className="mt-2 flex flex-wrap gap-2">
          {addable.length === 0 ? (
            <span className="text-[13px] text-label-3">Ya tiene todos los roles.</span>
          ) : (
            addable.map((r) => (
              <form key={r} action={addMemberRoleAction} onSubmit={() => setOpen(false)}>
                <input type="hidden" name="memberId" value={memberId} />
                <input type="hidden" name="role" value={r} />
                <button className="inline-flex min-h-[38px] items-center gap-1 rounded-full bg-surface-2 px-4 text-[13px] font-medium text-label transition active:scale-95">
                  <span className="text-[15px] leading-none">＋</span> {LABEL[r]}
                </button>
              </form>
            ))
          )}
        </div>
      )}
    </div>
  );
}
