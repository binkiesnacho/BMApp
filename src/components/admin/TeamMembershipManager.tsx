"use client";

import { useState } from "react";
import MembershipToggle from "./MembershipToggle";

type TeamOpt = { id: string; name: string };

/**
 * Gestión compacta de equipos de un miembro: los equipos donde ya participa se
 * muestran arriba y un botón "Añadir equipo" despliega el resto del club para
 * asignarlo como jugador o entrenador.
 */
export default function TeamMembershipManager({
  memberId,
  teams,
  coachTeamIds,
  playerTeamIds,
  canAssignCoach,
}: {
  memberId: string;
  teams: TeamOpt[];
  coachTeamIds: string[];
  playerTeamIds: string[];
  canAssignCoach: boolean;
}) {
  const [open, setOpen] = useState(false);
  const coach = new Set(coachTeamIds);
  const player = new Set(playerTeamIds);
  const joined = teams.filter((t) => coach.has(t.id) || player.has(t.id));
  const others = teams.filter((t) => !coach.has(t.id) && !player.has(t.id));

  const row = (t: TeamOpt) => (
    <li
      key={t.id}
      className="flex items-center justify-between gap-2 rounded-2xl bg-surface px-4 py-3"
    >
      <span className="min-w-0 truncate text-[15px] text-label">{t.name}</span>
      <MembershipToggle
        teamId={t.id}
        profileId={memberId}
        isCoach={coach.has(t.id)}
        isPlayer={player.has(t.id)}
        canAssignCoach={canAssignCoach}
      />
    </li>
  );

  return (
    <div>
      <ul className="space-y-2">
        {joined.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-separator/70 px-4 py-3 text-[13px] text-label-3">
            Sin equipos todavía.
          </li>
        ) : (
          joined.map(row)
        )}
      </ul>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-2 inline-flex min-h-[38px] items-center gap-1 rounded-full border border-dashed border-separator px-4 text-[13px] font-medium text-label-2 transition active:scale-95"
      >
        <span className="text-[15px] leading-none">＋</span> Añadir equipo
      </button>

      {open && (
        <ul className="mt-2 space-y-2">
          {others.length === 0 ? (
            <li className="text-[13px] text-label-3">Ya está en todos los equipos.</li>
          ) : (
            others.map(row)
          )}
        </ul>
      )}
    </div>
  );
}
