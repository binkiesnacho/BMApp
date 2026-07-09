/**
 * Tipos de dominio de BMApp.
 * (Cuando el esquema se estabilice, se pueden autogenerar con:
 *  `supabase gen types typescript --project-id gqslmipjchgbizkbtqqe`)
 */

export type UserRole = "admin" | "coach" | "player" | "tecnico";

export type MatchStatus = "scheduled" | "live" | "finished";

export type StatEventType =
  | "goal"
  | "miss"
  | "save"
  | "exclusion_2min"
  | "yellow_card"
  | "red_card"
  | "turnover"
  | "assist"
  | "goal_conceded";

export interface Club {
  id: string;
  name: string;
  join_code: string;
  logo_url: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  club_id: string | null;
  name: string;
  /** Rol principal (para orden/compatibilidad). Los roles reales están en `roles`. */
  role: UserRole;
  /** Todos los roles del usuario (multi-rol). */
  roles: UserRole[];
  /** Equipo del jugador (solo para role='player'). */
  team_id: string | null;
  /** Administrador global: acceso total a todos los clubs. */
  is_superadmin: boolean;
  created_at: string;
}

export interface Invite {
  id: string;
  club_id: string;
  code: string;
  role: Exclude<UserRole, "admin">;
  team_id: string | null;
  label: string | null;
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
  /** Cuenta (profiles) vinculada a esta ficha del roster. */
  profile_id: string | null;
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

/** Trazo de pizarra: color, grosor y puntos planos [x0,y0,x1,y1,…] en
 *  coordenadas de pista (0..400 en x, 0..200 en y). */
export interface DrawStroke {
  color: string;
  width: number;
  points: number[];
}

/** Ficha arrastrable: atacante (círculo) o defensor (triángulo). */
export type TokenShape = "attacker" | "defender";
export interface DrawToken {
  shape: TokenShape;
  x: number;
  y: number;
}

/** Pizarra táctica (vector) de un ejercicio, sobre una pista de balonmano. */
export interface TrainingDrawing {
  /** Pista completa (400×200) o media pista (200×200). Por defecto completa. */
  court?: "full" | "half";
  strokes: DrawStroke[];
  tokens?: DrawToken[];
}

/** Una pizarra de una fase: dibujo sobre la pista + descripción opcional. */
export interface TrainingBoard {
  drawing: TrainingDrawing;
  description?: string | null;
}

export interface TrainingPhase {
  name: string;
  minutes: number;
  /** Dibujo único (formato antiguo, solo lectura para datos existentes). */
  drawing?: TrainingDrawing | null;
  /** Varias pizarras del ejercicio, cada una con su descripción. */
  boards?: TrainingBoard[];
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

export type ObservationSource = "training" | "match" | "player";

/** Observación del cuerpo técnico, ligable a un jugador. */
export interface Observation {
  id: string;
  team_id: string;
  author_id: string | null;
  player_id: string | null;
  source_type: ObservationSource;
  training_id: string | null;
  match_id: string | null;
  body: string;
  occurred_at: string;
  created_at: string;
}

/** Fila de rival en la clasificación (nuestra fila se calcula desde matches). */
export interface StandingsRow {
  id: string;
  team_id: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  created_at: string;
}
