-- =============================================================================
-- BMApp — Migración 0026: tiempo muerto + distancia del lanzamiento
--
--  * stat_event_type += 'timeout': tiempo muerto (evento de equipo, sin jugador),
--    guarda el minuto en game_second.
--  * stats_events.distance: origen del lanzamiento en eventos de tiro
--    (goal / miss / save / goal_conceded). Valores: 6m, 7m, 9m, counter (contra).
-- Ejecutar sobre una BD con 0001–0025 aplicadas.
--
-- Nota: 'alter type ... add value' no puede USARSE en la misma transacción en la
-- que se añade; aquí solo se declara, así que es seguro.
-- =============================================================================

alter type stat_event_type add value if not exists 'timeout';

alter table public.stats_events
  add column if not exists distance text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stats_events_distance_check'
  ) then
    alter table public.stats_events
      add constraint stats_events_distance_check
      check (distance is null or distance in ('6m', '7m', '9m', 'counter'));
  end if;
end $$;
