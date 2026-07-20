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
  | "goal_conceded"
  | "timeout";

/** Origen del lanzamiento (solo en eventos de tiro). counter = contraataque. */
export type ShotDistance = "6m" | "7m" | "9m" | "counter";

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

/** Ficha arrastrable: atacante (círculo), defensor (triángulo) o balón. */
export type TokenShape = "attacker" | "defender" | "ball";
export interface DrawToken {
  /** Identidad estable entre fotogramas: permite interpolar (lerp) su movimiento.
   *  Opcional por compatibilidad con pizarras guardadas antes de las jugadas. */
  id?: string;
  shape: TokenShape;
  x: number;
  y: number;
}

/** Un fotograma de una jugada: trazos + posición de las fichas. */
export interface DrawFrame {
  strokes: DrawStroke[];
  tokens: DrawToken[];
}

/** Pizarra táctica (vector) de un ejercicio, sobre una pista de balonmano.
 *  Con varios `frames` se convierte en una jugada animada: al reproducir se
 *  interpolan las posiciones de cada ficha (por `id`) entre fotogramas. */
export interface TrainingDrawing {
  /** Pista completa (400×200) o media pista (200×200). Por defecto completa. */
  court?: "full" | "half";
  /** Primer fotograma. Se mantiene siempre sincronizado con `frames[0]` para que
   *  las pizarras antiguas (sin `frames`) se sigan leyendo igual. */
  strokes: DrawStroke[];
  tokens?: DrawToken[];
  /** Todos los fotogramas de la jugada (incluido el primero). */
  frames?: DrawFrame[];
  /** Milisegundos de transición entre fotogramas al reproducir. */
  frameMs?: number;
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
  /** Cuándo se pasó lista (null = aún sin hacer). */
  attendance_taken_at: string | null;
  /** Quién pasó lista. */
  attendance_by: string | null;
  created_at: string;
}

export interface TrainingAttendance {
  id: string;
  training_id: string;
  player_id: string;
  attended: boolean;
  created_at: string;
}

/** Zonas de la portería: 1-2-3 arriba (izq→der), 4-5-6 abajo (izq→der). */
export type GoalZone = 1 | 2 | 3 | 4 | 5 | 6;

/** Eventos de tiro: son los únicos que registran zona de portería. */
export const SHOT_EVENTS = ["goal", "miss", "save", "goal_conceded"] as const;
export type ShotEvent = (typeof SHOT_EVENTS)[number];
export const isShotEvent = (t: StatEventType): t is ShotEvent =>
  (SHOT_EVENTS as readonly string[]).includes(t);

export interface StatEvent {
  id: string;
  match_id: string;
  player_id: string | null;
  event_type: StatEventType;
  game_second: number | null;
  /** Parte de la portería del tiro (solo en eventos de tiro). */
  goal_zone: GoalZone | null;
  /** Origen del lanzamiento (solo en eventos de tiro). */
  distance: ShotDistance | null;
  created_at: string;
}

/** Jugador convocado para un partido (alineación guardada con antelación). */
export interface MatchSquad {
  id: string;
  match_id: string;
  player_id: string;
  created_at: string;
}

/** Adjunto de un entrenamiento (foto o PDF) en el bucket privado. */
export interface TrainingFile {
  id: string;
  training_id: string;
  path: string;
  name: string;
  mime: string;
  size_bytes: number | null;
  author_id: string | null;
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
