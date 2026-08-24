-- =============================================================================
-- BMApp — Migración 0029: técnicos también editan la plantilla
--
-- Hasta ahora la gestión de la plantilla (tabla players) era de entrenadores y
-- admin (can_manage_team). Se amplía a los técnicos del equipo, que ya podían
-- capturar en vivo y gestionar entrenamientos: pasa a can_capture_team.
--   * players_write: can_manage_team → can_capture_team.
--   * set_team_player: acepta también can_capture_team (además de admin).
-- La asignación de ENTRENADORES (set_team_coach) sigue siendo solo de admin.
-- Ejecutar sobre una BD con 0001–0028 aplicadas.
-- =============================================================================

drop policy if exists players_write on public.players;
create policy players_write on public.players
  for all
  using (public.can_capture_team(team_id))
  with check (public.can_capture_team(team_id));

create or replace function public.set_team_player(
  target_team uuid, target_profile uuid, present boolean
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare caller_club uuid; t_club uuid; p_club uuid; p_name text; pl_id uuid;
begin
  -- Admin, entrenador o técnico del equipo.
  if not (public.is_admin() or public.can_capture_team(target_team)) then
    raise exception 'Sin permisos sobre este equipo';
  end if;
  select club_id into caller_club from public.profiles where id = auth.uid();
  select club_id into t_club from public.teams where id = target_team;
  select club_id, coalesce(nullif(trim(name), ''), 'Jugador')
    into p_club, p_name from public.profiles where id = target_profile;
  if t_club is distinct from caller_club or p_club is distinct from caller_club then
    raise exception 'Fuera de tu club';
  end if;

  if present then
    insert into public.players(team_id, name, profile_id)
      values (target_team, p_name, target_profile)
      on conflict (team_id, profile_id) where profile_id is not null do nothing;
    update public.profiles
      set roles = (case when 'player' = any(roles) then roles else roles || 'player'::user_role end)
      where id = target_profile;
  else
    select id into pl_id from public.players
      where team_id = target_team and profile_id = target_profile;
    if pl_id is not null then
      if exists (select 1 from public.stats_events where player_id = pl_id)
         or exists (select 1 from public.training_attendance where player_id = pl_id) then
        update public.players set profile_id = null where id = pl_id;
      else
        delete from public.players where id = pl_id;
      end if;
    end if;
    if not exists (select 1 from public.players where profile_id = target_profile) then
      update public.profiles set roles = array_remove(roles, 'player'::user_role) where id = target_profile;
    end if;
  end if;
  update public.profiles set role = public.primary_role(roles) where id = target_profile;
end;
$function$;
