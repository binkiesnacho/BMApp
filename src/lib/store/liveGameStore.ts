import { create } from "zustand";
import type { GoalZone, ShotDistance, StatEventType } from "@/lib/types/database";

/** Evento capturado en vivo, aún no persistido en Supabase. */
export interface LiveEvent {
  /** id temporal en cliente (crypto.randomUUID) */
  tempId: string;
  playerId: string | null;
  eventType: StatEventType;
  gameSecond: number;
  /** Parte de la portería (solo tiros); null si no se indicó. */
  goalZone: GoalZone | null;
  /** Distancia/origen del lanzamiento (solo tiros); null si no se indicó. */
  distance: ShotDistance | null;
  createdAt: number;
}

interface LiveGameState {
  matchId: string | null;
  isRunning: boolean;
  /** segundos de reloj de partido transcurridos */
  elapsed: number;
  /** Duración de cada parte en segundos (25–30 min según categoría). */
  halfLength: number;
  /** Parte en curso: 1 (0→halfLength) o 2 (halfLength→2·halfLength). */
  period: 1 | 2;
  /** goles del rival (los nuestros se cuentan de los eventos 'goal') */
  oppScore: number;
  events: LiveEvent[];

  startMatch: (matchId: string, initialOppScore?: number) => void;
  toggleClock: () => void;
  tick: () => void;
  /** Fija los minutos por parte (recalcula el tope del reloj). */
  setHalfMinutes: (minutes: number) => void;
  /** Arranca la 2ª parte: fija el reloj al minuto que le toca (halfLength). */
  startSecondHalf: () => void;
  /** Segundos a los que termina la parte en curso. */
  periodEnd: () => number;
  addEvent: (
    playerId: string | null,
    eventType: StatEventType,
    goalZone?: GoalZone | null,
    distance?: ShotDistance | null
  ) => void;
  undoLast: () => void;
  setOppScore: (n: number) => void;
  reset: () => void;
}

const DEFAULT_HALF = 30 * 60; // 30 min por parte por defecto

export const useLiveGameStore = create<LiveGameState>((set, get) => ({
  matchId: null,
  isRunning: false,
  elapsed: 0,
  halfLength: DEFAULT_HALF,
  period: 1,
  oppScore: 0,
  events: [],

  startMatch: (matchId, initialOppScore = 0) =>
    set((s) => ({
      matchId,
      isRunning: false,
      elapsed: 0,
      // Conserva la duración por parte que el entrenador haya configurado.
      halfLength: s.halfLength,
      period: 1,
      oppScore: initialOppScore,
      events: [],
    })),

  toggleClock: () => set((s) => ({ isRunning: !s.isRunning })),

  periodEnd: () => {
    const s = get();
    return s.period === 1 ? s.halfLength : s.halfLength * 2;
  },

  tick: () =>
    set((s) => {
      if (!s.isRunning) return {};
      const limit = s.period === 1 ? s.halfLength : s.halfLength * 2;
      const next = s.elapsed + 1;
      // Al llegar al tope de la parte, el reloj se para exactamente ahí.
      if (next >= limit) return { elapsed: limit, isRunning: false };
      return { elapsed: next };
    }),

  setHalfMinutes: (minutes) =>
    set(() => ({ halfLength: Math.max(1, Math.round(minutes)) * 60 })),

  startSecondHalf: () =>
    set((s) => ({ period: 2, elapsed: s.halfLength, isRunning: false })),

  addEvent: (playerId, eventType, goalZone = null, distance = null) =>
    set((s) => ({
      // Un gol encajado suma al tanteo rival (los +/- quedan para corregir).
      oppScore: eventType === "goal_conceded" ? s.oppScore + 1 : s.oppScore,
      events: [
        ...s.events,
        {
          tempId: crypto.randomUUID(),
          playerId,
          eventType,
          gameSecond: get().elapsed,
          goalZone,
          distance,
          createdAt: Date.now(),
        },
      ],
    })),

  undoLast: () =>
    set((s) => {
      const last = s.events[s.events.length - 1];
      return {
        events: s.events.slice(0, -1),
        // Deshacer un gol encajado también resta del tanteo rival.
        oppScore:
          last?.eventType === "goal_conceded"
            ? Math.max(0, s.oppScore - 1)
            : s.oppScore,
      };
    }),

  setOppScore: (n) => set({ oppScore: Math.max(0, n) }),

  reset: () =>
    set((s) => ({
      matchId: null,
      isRunning: false,
      elapsed: 0,
      // La duración por parte es una preferencia; se mantiene entre partidos.
      halfLength: s.halfLength,
      period: 1,
      oppScore: 0,
      events: [],
    })),
}));
