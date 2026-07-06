"use client";

import { useState } from "react";
import { createInviteAction, deleteInviteAction } from "./actions";
import type { Invite, Team } from "@/lib/types/database";

const ROLE_LABEL: Record<string, string> = {
  player: "Jugador",
  coach: "Entrenador",
  tecnico: "Técnico",
};

function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
      className="tap font-mono text-[15px] tracking-widest text-brand"
    >
      {copied ? "¡Copiado!" : code}
    </button>
  );
}

export default function InvitesManager({
  invites,
  teams,
}: {
  invites: Invite[];
  teams: Team[];
}) {
  const teamName = (id: string | null) => teams.find((t) => t.id === id)?.name;

  return (
    <div className="space-y-3">
      {/* Crear invitación */}
      <form action={createInviteAction} className="flex flex-wrap gap-2">
        <select
          name="role"
          defaultValue="player"
          className="flex-1 rounded-lg border border-separator bg-canvas px-2 py-1.5 text-[13px] text-label outline-none focus:border-brand"
        >
          <option value="player">Jugador</option>
          <option value="tecnico">Técnico</option>
          <option value="coach">Entrenador</option>
        </select>
        <select
          name="teamId"
          defaultValue=""
          className="flex-1 rounded-lg border border-separator bg-canvas px-2 py-1.5 text-[13px] text-label outline-none focus:border-brand"
        >
          <option value="">Sin equipo</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-brand px-3 py-1.5 text-[13px] font-semibold text-white">
          Crear
        </button>
      </form>

      {/* Lista de invitaciones */}
      {invites.length === 0 ? (
        <p className="text-[12px] text-label-3">
          Crea invitaciones con rol (y equipo) para compartir con cada persona.
        </p>
      ) : (
        <ul className="divide-y divide-separator/50 overflow-hidden rounded-xl bg-canvas">
          {invites.map((inv) => (
            <li key={inv.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-label">
                  {ROLE_LABEL[inv.role]}
                  {inv.team_id && (
                    <span className="text-label-3">
                      {" "}
                      · {teamName(inv.team_id) ?? "equipo"}
                    </span>
                  )}
                </p>
                <InviteCode code={inv.code} />
              </div>
              <form action={deleteInviteAction}>
                <input type="hidden" name="inviteId" value={inv.id} />
                <button className="rounded-lg px-2 py-1 text-[12px] text-label-3 hover:text-negative">
                  Borrar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
