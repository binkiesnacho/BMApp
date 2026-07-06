-- =============================================================================
-- BMApp — Migración 0014: evento "gol encajado" (para % de parada del portero)
-- Ejecutar sobre una BD con 0001–0013 aplicadas.
-- =============================================================================

alter type stat_event_type add value if not exists 'goal_conceded';
