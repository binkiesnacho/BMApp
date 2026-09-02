-- =============================================================================
-- BMApp — Migración 0031: equipo automático "Porteros"
--
-- Un equipo cuyo roster se sincroniza solo con todos los jugadores de posición
-- "Portero" de los demás equipos del club. Se le puede asignar un entrenador
-- como a cualquier equipo (team_coaches). Implementación con filas "espejo":
--   * teams.auto_position: si está, el equipo se autogenera con esa posición.
--   * players.source_player_id: vínculo del espejo con su jugador de origen
--     (on delete cascade → al borrar el origen, se borra el espejo).
--   * trigger que crea/actualiza/borra el espejo según la posición del origen.
-- Ejecutar sobre una BD con 0001–0030 aplicadas.
-- =============================================================================

alter table public.teams add column if not exists auto_position text;

alter table public.players add column if not exists source_player_id uuid
  references public.players(id) on delete cascade;
create index if not exists players_source_idx on public.players(source_player_id);

-- Equipo "Porteros" para cada club que no lo tenga.
insert into public.teams (club_id, name, auto_position)
select c.id, 'Porteros', 'Portero'
from public.clubs c
where not exists (
  select 1 from public.teams t where t.club_id = c.id and t.auto_position = 'Portero'
);

-- Sincroniza el espejo del jugador de origen en el equipo de porteros del club.
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
begin
  -- Datos del equipo del jugador afectado.
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

  -- Al borrar el origen, el espejo cae por cascada (source_player_id).
  if TG_OP = 'DELETE' then
    return OLD;
  end if;

  if NEW.position is not distinct from 'Portero' then
    if exists (select 1 from public.players where source_player_id = NEW.id) then
      update public.players
        set name = NEW.name, number = NEW.number, profile_id = NEW.profile_id
        where source_player_id = NEW.id;
    else
      insert into public.players (team_id, name, number, position, profile_id, source_player_id)
        values (gk_team, NEW.name, NEW.number, 'Portero', NEW.profile_id, NEW.id);
    end if;
  else
    delete from public.players where source_player_id = NEW.id;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_sync_goalkeepers on public.players;
create trigger trg_sync_goalkeepers
  after insert or update or delete on public.players
  for each row execute function public.sync_goalkeeper_team();

-- Backfill: espejar los porteros actuales de equipos normales.
insert into public.players (team_id, name, number, position, profile_id, source_player_id)
select gk.id, p.name, p.number, 'Portero', p.profile_id, p.id
from public.players p
join public.teams t on t.id = p.team_id and t.auto_position is null
join public.teams gk on gk.club_id = t.club_id and gk.auto_position = 'Portero'
where p.position = 'Portero'
  and not exists (select 1 from public.players m where m.source_player_id = p.id);
