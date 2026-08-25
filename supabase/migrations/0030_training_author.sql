-- =============================================================================
-- BMApp — Migración 0030: autor del entrenamiento
--
-- Registra qué entrenador/técnico creó cada entrenamiento, para consultarlo
-- después. Se rellena en la creación (createTrainingAction) con el usuario.
-- Ejecutar sobre una BD con 0001–0029 aplicadas.
-- =============================================================================

alter table public.trainings
  add column if not exists author_id uuid references public.profiles(id) on delete set null;
