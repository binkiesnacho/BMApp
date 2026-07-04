import type { StatEventType } from "@/lib/types/database";

/** Etiquetas, iconos y orden de los tipos de evento in-game. */
export const EVENT_LABELS: Record<
  StatEventType,
  { label: string; short: string; icon: string; scores?: boolean }
> = {
  goal: { label: "Gol", short: "Gol", icon: "🥅", scores: true },
  assist: { label: "Asistencia", short: "Asist.", icon: "🎯" },
  save: { label: "Parada", short: "Parada", icon: "🧤" },
  miss: { label: "Fallo", short: "Fallo", icon: "❌" },
  turnover: { label: "Pérdida", short: "Pérdida", icon: "🔄" },
  exclusion_2min: { label: "Exclusión 2'", short: "2 min", icon: "🟧" },
  yellow_card: { label: "Amarilla", short: "Amar.", icon: "🟨" },
  red_card: { label: "Roja", short: "Roja", icon: "🟥" },
};

/** Orden de los botones en la pantalla de captura en vivo. */
export const EVENT_ORDER: StatEventType[] = [
  "goal",
  "assist",
  "save",
  "miss",
  "turnover",
  "exclusion_2min",
  "yellow_card",
  "red_card",
];
