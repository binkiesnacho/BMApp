import type { StatEvent, StatEventType } from "@/lib/types/database";

export type EventCounts = Partial<Record<StatEventType, number>>;

/** Agrega los eventos por jugador (ignora eventos sin jugador). */
export function aggregateByPlayer(
  events: StatEvent[]
): Map<string, EventCounts> {
  const map = new Map<string, EventCounts>();
  for (const e of events) {
    if (!e.player_id) continue;
    const row = map.get(e.player_id) ?? {};
    row[e.event_type] = (row[e.event_type] ?? 0) + 1;
    map.set(e.player_id, row);
  }
  return map;
}

/** % de acierto en tiro = goles / (goles + fallos). null si no hubo tiros. */
export function shootingAccuracy(c: EventCounts): number | null {
  const goals = c.goal ?? 0;
  const shots = goals + (c.miss ?? 0);
  return shots > 0 ? Math.round((goals / shots) * 100) : null;
}
