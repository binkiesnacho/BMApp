-- 0020: Observaciones unificadas (entreno / partido / perfil), ligables a un
-- jugador. Visibles SOLO para el cuerpo técnico del equipo (nunca los jugadores),
-- con autor y fecha de origen. Sustituye a match_comments.
create table if not exists public.observations (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams (id) on delete cascade,
  author_id   uuid references public.profiles (id) on delete set null,
  player_id   uuid references public.players (id) on delete cascade,
  source_type text not null check (source_type in ('training', 'match', 'player')),
  training_id uuid references public.trainings (id) on delete set null,
  match_id    uuid references public.matches (id) on delete set null,
  body        text not null,
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index if not exists observations_player_idx on public.observations (player_id);
create index if not exists observations_training_idx on public.observations (training_id);
create index if not exists observations_match_idx on public.observations (match_id);
create index if not exists observations_team_idx on public.observations (team_id);

alter table public.observations enable row level security;

-- Solo el cuerpo técnico del equipo (admin o entrenador del equipo) ve/gestiona.
drop policy if exists observations_select on public.observations;
create policy observations_select on public.observations
  for select using (public.can_manage_team(team_id));

drop policy if exists observations_insert on public.observations;
create policy observations_insert on public.observations
  for insert with check (
    author_id = auth.uid() and public.can_manage_team(team_id)
  );

drop policy if exists observations_delete on public.observations;
create policy observations_delete on public.observations
  for delete using (
    author_id = auth.uid() or public.can_manage_team(team_id)
  );

-- Migrar los comentarios de partido existentes al nuevo modelo (origen 'match').
insert into public.observations
  (team_id, author_id, player_id, source_type, match_id, body, occurred_at, created_at)
select m.team_id, mc.author_id, null, 'match', mc.match_id, mc.body, m.date, mc.created_at
from public.match_comments mc
join public.matches m on m.id = mc.match_id;

drop table if exists public.match_comments;
