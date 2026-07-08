import Link from "next/link";
import AddObservationForm, { type AddContext } from "./AddObservationForm";
import { deleteObservationAction } from "./actions";
import type { EnrichedObservation, } from "@/lib/observations";
import type { ObservationSource } from "@/lib/types/database";

const SOURCE: Record<ObservationSource, { label: string; icon: string }> = {
  training: { label: "Entreno", icon: "🏋️" },
  match: { label: "Partido", icon: "🤾" },
  player: { label: "Nota", icon: "📝" },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

/**
 * Sección de observaciones (solo cuerpo técnico). Reutilizable en el detalle de
 * entreno/partido y en el perfil del jugador.
 *  - showSource: muestra de dónde viene cada observación (perfil del jugador).
 *  - showPlayer: muestra a qué jugador se refiere (entreno/partido).
 *  - linkPlayer: enlaza el nombre del jugador a su ficha.
 */
export default function ObservationsSection({
  observations,
  canManage,
  ctx,
  players,
  fixedPlayerId,
  showSource = false,
  showPlayer = false,
  linkPlayer = false,
}: {
  observations: EnrichedObservation[];
  canManage: boolean;
  ctx: AddContext;
  players?: { id: string; name: string; number: number | null }[];
  fixedPlayerId?: string;
  showSource?: boolean;
  showPlayer?: boolean;
  linkPlayer?: boolean;
}) {
  if (!canManage) return null;

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-label">Observaciones</h2>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-label-3">
          privadas · cuerpo técnico
        </span>
      </div>

      <AddObservationForm ctx={ctx} players={players} fixedPlayerId={fixedPlayerId} />

      {observations.length > 0 ? (
        <ul className="space-y-2">
          {observations.map((o) => {
            const src = SOURCE[o.source_type];
            return (
              <li key={o.id} className="rounded-2xl bg-surface px-3 py-2.5">
                <p className="whitespace-pre-wrap text-[14px] text-label">{o.body}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-label-3">
                  {showSource && (
                    <span className="rounded-full bg-surface-2 px-1.5 py-0.5">
                      {src.icon} {src.label}
                    </span>
                  )}
                  {showPlayer && o.playerName && (
                    <span className="text-brand">
                      {linkPlayer && o.player_id ? (
                        <Link href={`/players/${o.player_id}`}>{o.playerName}</Link>
                      ) : (
                        o.playerName
                      )}
                    </span>
                  )}
                  <span>{o.authorName}</span>
                  <span>· {fmt(o.occurred_at)}</span>
                  <form action={deleteObservationAction} className="ml-auto">
                    <input type="hidden" name="observationId" value={o.id} />
                    {ctx.trainingId && (
                      <input type="hidden" name="trainingId" value={ctx.trainingId} />
                    )}
                    {ctx.matchId && <input type="hidden" name="matchId" value={ctx.matchId} />}
                    {o.player_id && (
                      <input type="hidden" name="playerId" value={o.player_id} />
                    )}
                    <button
                      className="rounded-lg px-1.5 py-0.5 text-label-3 hover:text-negative"
                      aria-label="Eliminar observación"
                    >
                      ✕
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-separator/70 p-4 text-center text-[13px] text-label-3">
          Sin observaciones todavía.
        </p>
      )}
    </section>
  );
}
