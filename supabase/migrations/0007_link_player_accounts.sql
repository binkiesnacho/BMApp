-- =============================================================================
-- BMApp — Migración 0007: vincular cuentas de jugador con la ficha del roster
-- Ejecutar en Supabase → SQL Editor sobre una BD con 0001–0006 aplicadas.
-- =============================================================================

-- Una ficha de jugador (players) puede vincularse a una cuenta (profiles).
alter table public.players
  add column if not exists profile_id uuid references public.profiles (id) on delete set null;

-- Cada cuenta se vincula, como mucho, a una ficha (los NULL no cuentan).
create unique index if not exists players_profile_id_uidx
  on public.players (profile_id)
  where profile_id is not null;
