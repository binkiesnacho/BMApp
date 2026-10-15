-- =============================================================================
-- BMApp — Migración 0032: posiciones múltiples por jugador + alineación por equipo
--
--  * players.positions text[]: un jugador puede ocupar varias posiciones
--    (extremo, lateral, central, pivote, portero). Se mantiene players.position
--    (= primera posición) por compatibilidad y para el equipo automático Porteros.
--  * team_lineups: una alineación por equipo (ataque + sistema defensivo +
--    defensa), guardada automáticamente. attack/defense son mapas posición→jugador.
-- Ejecutar sobre una BD con 0001–0031 aplicadas.
-- =============================================================================

-- ---- 1) Posiciones múltiples ------------------------------------------------
alter table public.players
  add column if not exists positions text[] not null default '{}';

-- Backfill: la posición única existente pasa a ser el primer elemento del array.
update public.players
  set positions = array[position]
  where position is not null
    and (positions is null or positions = '{}');

-- El equipo Porteros se sincroniza si el jugador es portero en CUALQUIERA de sus
-- posiciones (antes solo miraba la posición única).
create or replace function public.sync_goalkeeper_team()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  src_club uuid;
  src_auto text;
  gk_team uuid;
  is_gk boolean;
begin
  if TG_OP = 'DELETE' then
    select t.club_id, t.auto_position into src_club, src_auto
      from public.teams t where t.id = OLD.team_id;
  else
    select t.club_id, t.auto_position into src_club, src_auto
      from public.teams t where t.id = NEW.team_id;
  end if;

  -- No espejar filas que ya están en un equipo automático (evita recursión).
  if src_auto is not null then
    return coalesce(NEW, OLD);
  end if;

  select id into gk_team from public.teams
    where club_id = src_club and auto_position = 'Portero' limit 1;
  if gk_team is null then
    return coalesce(NEW, OLD);
  end if;

  if TG_OP = 'DELETE' then
    return OLD;
  end if;

  is_gk := (NEW.position is not distinct from 'Portero')
        or ('Portero' = any(coalesce(NEW.positions, '{}')));

  if is_gk then
    if exists (select 1 from public.players where source_player_id = NEW.id) then
      update public.players
        set name = NEW.name, number = NEW.number, profile_id = NEW.profile_id
        where source_player_id = NEW.id;
    else
      insert into public.players (team_id, name, number, position, positions, profile_id, source_player_id)
        values (gk_team, NEW.name, NEW.number, 'Portero', array['Portero'], NEW.profile_id, NEW.id);
    end if;
  else
    delete from public.players where source_player_id = NEW.id;
  end if;

  return NEW;
end;
$$;

-- ---- 2) Alineación del equipo ----------------------------------------------
create table if not exists public.team_lineups (
  team_id uuid primary key references public.teams(id) on delete cascade,
  defense_system text not null default '6-0',
  attack jsonb not null default '{}'::jsonb,
  defense jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.team_lineups enable row level security;

-- Lectura: quien puede ver el equipo.
drop policy if exists team_lineups_select on public.team_lineups;
create policy team_lineups_select on public.team_lineups
  for select using (public.can_view_team(team_id));

-- Escritura: quien puede capturar en ese equipo (staff + entrenador + técnico).
drop policy if exists team_lineups_write on public.team_lineups;
create policy team_lineups_write on public.team_lineups
  for all
  using (public.can_capture_team(team_id))
  with check (public.can_capture_team(team_id));
