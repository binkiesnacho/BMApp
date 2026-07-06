import type { Match, StandingsRow } from "@/lib/types/database";

/** Puntuación de balonmano: victoria 2, empate 1, derrota 0. */
export const POINTS_WIN = 2;
export const POINTS_DRAW = 1;

export interface TableRow {
  id: string | null; // id de standings_rows (rivales) o null (nuestra fila)
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  isUs: boolean;
}

function withDerived(
  base: Omit<TableRow, "gd" | "points">
): TableRow {
  return {
    ...base,
    gd: base.gf - base.ga,
    points: base.won * POINTS_WIN + base.drawn * POINTS_DRAW,
  };
}

/** Calcula nuestra fila a partir de los partidos finalizados del equipo. */
export function ourRow(matches: Match[], teamName: string): TableRow {
  let won = 0,
    drawn = 0,
    lost = 0,
    gf = 0,
    ga = 0;
  for (const m of matches) {
    if (m.status !== "finished") continue;
    gf += m.our_score;
    ga += m.opp_score;
    if (m.our_score > m.opp_score) won++;
    else if (m.our_score === m.opp_score) drawn++;
    else lost++;
  }
  return withDerived({
    id: null,
    name: teamName,
    played: won + drawn + lost,
    won,
    drawn,
    lost,
    gf,
    ga,
    isUs: true,
  });
}

function rivalRow(r: StandingsRow): TableRow {
  return withDerived({
    id: r.id,
    name: r.name,
    played: r.played,
    won: r.won,
    drawn: r.drawn,
    lost: r.lost,
    gf: r.gf,
    ga: r.ga,
    isUs: false,
  });
}

/**
 * Construye la clasificación ordenada: puntos ↓, diferencia ↓, GF ↓, nombre ↑.
 * Une nuestra fila (calculada) con las de los rivales (guardadas).
 */
export function buildStandings(
  matches: Match[],
  teamName: string,
  rivals: StandingsRow[]
): TableRow[] {
  const rows = [ourRow(matches, teamName), ...rivals.map(rivalRow)];
  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      a.name.localeCompare(b.name, "es")
  );
  return rows;
}
