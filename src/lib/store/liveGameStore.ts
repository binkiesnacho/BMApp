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
  /** goles del rival (los nuestros se cuentan de los eventos 'goal') */
  oppScore: number;
  events: LiveEvent[];

  startMatch: (matchId: string, initialOppScore?: number) => void;
  toggleClock: () => void;
  tick: () => void;
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

export const useLiveGameStore = create<LiveGameState>((set, get) => ({
  matchId: null,
  isRunning: false,
  elapsed: 0,
  oppScore: 0,
  events: [],

  startMatch: (matchId, initialOppScore = 0) =>
    set({
      matchId,
      isRunning: false,
      elapsed: 0,
      oppScore: initialOppScore,
      events: [],
    }),

  toggleClock: () => set((s) => ({ isRunning: !s.isRunning })),

  tick: () => set((s) => (s.isRunning ? { elapsed: s.elapsed + 1 } : {})),

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
    set({ matchId: null, isRunning: false, elapsed: 0, oppScore: 0, events: [] }),
}));
