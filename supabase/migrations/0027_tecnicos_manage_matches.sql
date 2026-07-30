-- =============================================================================
-- BMApp — Migración 0027: técnicos con gestión completa de partidos
--
-- Entrenadores y técnicos de un equipo deben poder crear/editar/ver/eliminar
-- partidos (y capturar en vivo) y entrenamientos. Los entrenamientos y la
-- captura en vivo ya usan can_capture_team; solo faltaba abrir la creación y el
-- borrado de PARTIDOS, que estaban limitados a can_manage_team (entrenadores).
-- Ejecutar sobre una BD con 0001–0026 aplicadas.
-- =============================================================================

drop policy if exists matches_insert on public.matches;
create policy matches_insert on public.matches
  for insert with check (public.can_capture_team(team_id));

drop policy if exists matches_delete on public.matches;
create policy matches_delete on public.matches
  for delete using (public.can_capture_team(team_id));
