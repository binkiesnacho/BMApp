import { create } from "zustand";
import type { StatEventType } from "@/lib/types/database";

/** Evento capturado en vivo, aún no persistido en Supabase. */
export interface LiveEvent {
  /** id temporal en cliente (crypto.randomUUID) */
  tempId: string;
  playerId: string | null;
  eventType: StatEventType;
  gameSecond: number;
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
  addEvent: (playerId: string | null, eventType: StatEventType) => void;
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

  addEvent: (playerId, eventType) =>
    set((s) => ({
      events: [
        ...s.events,
        {
          tempId: crypto.randomUUID(),
          playerId,
          eventType,
          gameSecond: get().elapsed,
          createdAt: Date.now(),
        },
      ],
    })),

  undoLast: () => set((s) => ({ events: s.events.slice(0, -1) })),

  setOppScore: (n) => set({ oppScore: Math.max(0, n) }),

  reset: () =>
    set({ matchId: null, isRunning: false, elapsed: 0, oppScore: 0, events: [] }),
}));
