-- =============================================================================
-- BMApp — Migración 0006: entrenamientos + asistencia (faltas)
-- Ejecutar en Supabase → SQL Editor sobre una BD con 0001–0005 aplicadas.
-- =============================================================================

-- Entrenamientos de un equipo.
--   phases:     jsonb  [{ "name": "Calentamiento", "minutes": 10 }, ...]
--   objectives: jsonb  ["Mejorar el contraataque", "Defensa 6-0", ...]
create table if not exists public.trainings (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams (id) on delete cascade,
  date        timestamptz not null,
  title       text,
  description text,
  phases      jsonb not null default '[]'::jsonb,
  objectives  jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists trainings_team_id_idx on public.trainings (team_id);

-- Asistencia por jugador. attended=false => falta.
create table if not exists public.training_attendance (
  id          uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings (id) on delete cascade,
  player_id   uuid not null references public.players (id) on delete cascade,
  attended    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (training_id, player_id)
);
create index if not exists training_attendance_training_idx on public.training_attendance (training_id);
create index if not exists training_attendance_player_idx on public.training_attendance (player_id);

-- RLS ------------------------------------------------------------------------
alter table public.trainings           enable row level security;
alter table public.training_attendance enable row level security;

-- Trainings: lectura staff+jugador del equipo; escritura solo staff del equipo.
drop policy if exists trainings_select on public.trainings;
create policy trainings_select on public.trainings
  for select using (public.can_view_team(team_id));

drop policy if exists trainings_write on public.trainings;
create policy trainings_write on public.trainings
  for all
  using (public.can_manage_team(team_id))
  with check (public.can_manage_team(team_id));

-- Attendance: autorizado a través del entrenamiento → equipo.
drop policy if exists training_attendance_select on public.training_attendance;
create policy training_attendance_select on public.training_attendance
  for select using (
    exists (
      select 1 from public.trainings t
      where t.id = training_id and public.can_view_team(t.team_id)
    )
  );

drop policy if exists training_attendance_write on public.training_attendance;
create policy training_attendance_write on public.training_attendance
  for all
  using (
    exists (
      select 1 from public.trainings t
      where t.id = training_id and public.can_manage_team(t.team_id)
    )
  )
  with check (
    exists (
      select 1 from public.trainings t
      where t.id = training_id and public.can_manage_team(t.team_id)
    )
  );
