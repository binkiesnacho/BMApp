-- =============================================================================
-- BMApp — Migración 0024: zona de portería + convocatoria previa del partido
--
--  * stats_events.goal_zone: en qué parte de la portería fue el tiro (1..6).
--      1 2 3   (arriba: izq, centro, der)
--      4 5 6   (abajo:  izq, centro, der)
--    Solo tiene sentido en goal / miss / save / goal_conceded; es opcional.
--  * match_squad: convocatoria guardada con antelación para un partido.
-- Ejecutar sobre una BD con 0001–0023 aplicadas.
-- =============================================================================

-- ---- 1) Zona de portería en los eventos de tiro -----------------------------
alter table public.stats_events
  add column if not exists goal_zone smallint;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stats_events_goal_zone_check'
  ) then
    alter table public.stats_events
      add constraint stats_events_goal_zone_check
      check (goal_zone is null or goal_zone between 1 and 6);
  end if;
end $$;

-- ---- 2) Convocatoria del partido -------------------------------------------
create table if not exists public.match_squad (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create index if not exists match_squad_match_idx on public.match_squad(match_id);

alter table public.match_squad enable row level security;

-- Lectura: quien puede ver el equipo del partido.
drop policy if exists match_squad_select on public.match_squad;
create policy match_squad_select on public.match_squad
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and public.can_view_team(m.team_id)
    )
  );

-- Escritura: quien puede capturar en ese equipo (staff + técnico).
drop policy if exists match_squad_write on public.match_squad;
create policy match_squad_write on public.match_squad
  for all
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and public.can_capture_team(m.team_id)
    )
  )
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_id and public.can_capture_team(m.team_id)
    )
  );
