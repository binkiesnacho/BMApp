-- 0018: Clasificación de liga.
-- Nuestra fila se calcula en la app desde los partidos finalizados; aquí solo se
-- guardan las filas de los RIVALES (introducidas por el cuerpo técnico) para
-- poder mostrar la tabla completa y ordenada por equipo.
create table if not exists public.standings_rows (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  name       text not null,
  played     int  not null default 0,
  won        int  not null default 0,
  drawn      int  not null default 0,
  lost       int  not null default 0,
  gf         int  not null default 0,
  ga         int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists standings_rows_team_id_idx
  on public.standings_rows (team_id);

alter table public.standings_rows enable row level security;

drop policy if exists standings_select on public.standings_rows;
create policy standings_select on public.standings_rows
  for select using (public.can_view_team(team_id));

drop policy if exists standings_write on public.standings_rows;
create policy standings_write on public.standings_rows
  for all
  using (public.can_manage_team(team_id))
  with check (public.can_manage_team(team_id));
