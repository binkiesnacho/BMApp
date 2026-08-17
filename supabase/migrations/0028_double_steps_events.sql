-- =============================================================================
-- BMApp — Migración 0028: eventos "dobles" y "pasos"
--
-- Nuevos tipos de evento en la captura en vivo (segunda fila reorganizada):
-- pérdida (turnover, ya existía), dobles (double) y pasos (steps).
-- La sanción no es un tipo nuevo: se especifica como 2 min / amarilla / roja.
-- Ejecutar sobre una BD con 0001–0027 aplicadas.
-- =============================================================================

alter type stat_event_type add value if not exists 'double';
alter type stat_event_type add value if not exists 'steps';
