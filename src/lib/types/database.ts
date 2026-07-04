/**
 * Tipos de dominio de BMApp.
 * (Cuando el esquema se estabilice, se pueden autogenerar con:
 *  `supabase gen types typescript --project-id gqslmipjchgbizkbtqqe`)
 */

export type UserRole = "admin" | "coach" | "player";

export type MatchStatus = "scheduled" | "live" | "finished";

export type StatEventType =
  | "goal"
  | "miss"
  | "save"
  | "exclusion_2min"
  | "yellow_card"
  | "red_card"
  | "turnover"
  | "assist";

export interface Club {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
}

export interface Profile {
  id: string;
  club_id: string | null;
  name: string;
  role: UserRole;
  /** Equipo del jugador (solo para role='player'). */
  team_id: string | null;
  /** Administrador global: acceso total a todos los clubs. */
  is_superadmin: boolean;
  created_at: string;
}

export interface Team {
  id: string;
  club_id: string;
  name: string;
  coach_id: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
  position: string | null;
  created_at: string;
}

export interface Match {
  id: string;
  team_id: string;
  opponent: string;
  date: string;
  location: string | null;
  status: MatchStatus;
  our_score: number;
  opp_score: number;
  created_at: string;
}

export interface TrainingPhase {
  name: string;
  minutes: number;
}

export interface Training {
  id: string;
  team_id: string;
  date: string;
  title: string | null;
  description: string | null;
  phases: TrainingPhase[];
  objectives: string[];
  created_at: string;
}

export interface TrainingAttendance {
  id: string;
  training_id: string;
  player_id: string;
  attended: boolean;
  created_at: string;
}

export interface StatEvent {
  id: string;
  match_id: string;
  player_id: string | null;
  event_type: StatEventType;
  game_second: number | null;
  created_at: string;
}
