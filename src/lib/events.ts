import type { ShotDistance, StatEventType } from "@/lib/types/database";

/** Etiquetas, iconos y orden de los tipos de evento in-game. */
export const EVENT_LABELS: Record<
  StatEventType,
  { label: string; short: string; icon: string; scores?: boolean }
> = {
  goal: { label: "Gol", short: "Gol", icon: "🥅", scores: true },
  miss: { label: "Lanzamiento fallado", short: "L. Fallado", icon: "❌" },
  goal_conceded: { label: "Gol encajado", short: "Encajado", icon: "🥅" },
  save: { label: "Parada", short: "Parada", icon: "🧤" },
  turnover: { label: "Error", short: "Error", icon: "🔄" },
  exclusion_2min: { label: "Exclusión 2'", short: "2 min", icon: "🟧" },
  yellow_card: { label: "Amarilla", short: "Amar.", icon: "🟨" },
  red_card: { label: "Roja", short: "Roja", icon: "🟥" },
  assist: { label: "Asistencia", short: "Asist.", icon: "🎯" },
  timeout: { label: "Tiempo muerto", short: "T. muerto", icon: "⏱️" },
};

/**
 * Orden de los botones de evento en la captura en vivo.
 * Fila 1: Gol, L. Fallado, Encajado, Parada. Fila 2: Error, 2 min, Amar., Roja.
 * (La asistencia ya no se captura; el tiempo muerto tiene su propio botón.)
 */
export const EVENT_ORDER: StatEventType[] = [
  "goal",
  "miss",
  "goal_conceded",
  "save",
  "turnover",
  "exclusion_2min",
  "yellow_card",
  "red_card",
];

/** Distancia/origen del lanzamiento, elegible tras marcar la zona de portería. */
export const SHOT_DISTANCES: { value: ShotDistance; label: string }[] = [
  { value: "6m", label: "6 m" },
  { value: "7m", label: "7 m" },
  { value: "9m", label: "9 m" },
  { value: "counter", label: "Contraataque" },
];

export const distanceLabel = (d: ShotDistance) =>
  SHOT_DISTANCES.find((x) => x.value === d)?.label ?? d;
