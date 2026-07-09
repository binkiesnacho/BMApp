"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setTeamCoachAction,
  setTeamPlayerAction,
} from "@/app/(app)/admin/actions";

/**
 * Pastillas para asignar a una persona como jugador/entrenador de un equipo.
 * Usable desde el equipo (fijado profileId, variando por persona) o desde la
 * ficha (fijado teamId por fila). El toggle de entrenador solo se ofrece a admin.
 */
export default function MembershipToggle({
  teamId,
  profileId,
  isCoach,
  isPlayer,
  canAssignCoach,
}: {
  teamId: string;
  profileId: string;
  isCoach: boolean;
  isPlayer: boolean;
  canAssignCoach: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function toggle(kind: "coach" | "player", present: boolean) {
    setErr(null);
    start(async () => {
      const res =
        kind === "coach"
          ? await setTeamCoachAction(teamId, profileId, present)
          : await setTeamPlayerAction(teamId, profileId, present);
      if (res.error) setErr(res.error);
      else router.refresh();
    });
  }

  const pill = (active: boolean) =>
    `rounded-full px-3 py-1 text-[12px] font-medium disabled:opacity-40 ${
      active ? "bg-brand text-white" : "bg-surface-2 text-label-2"
    }`;

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => toggle("player", !isPlayer)}
        className={pill(isPlayer)}
      >
        {isPlayer ? "✓ " : "+ "}Jugador
      </button>
      {canAssignCoach && (
        <button
          type="button"
          disabled={pending}
          onClick={() => toggle("coach", !isCoach)}
          className={pill(isCoach)}
        >
          {isCoach ? "✓ " : "+ "}Entrenador
        </button>
      )}
      {err && <span className="text-[11px] text-negative">{err}</span>}
    </div>
  );
}
