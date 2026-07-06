-- 0016: al asignar rol "player" + equipo a un miembro, crear/mover su ficha de
-- roster (players) vinculada, para que aparezca en la plantilla y en "Mi ficha".

-- Sincroniza la ficha de roster de un perfil según su rol/equipo actuales.
--  - Si es jugador con equipo: crea la ficha en ese equipo (o mueve la existente).
--  - Si deja de ser jugador o se queda sin equipo: desvincula la ficha (conserva
--    stats, pero ya no es "su" ficha).
create or replace function public.sync_player_ficha(target uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  t_roles user_role[];
  t_team  uuid;
  t_name  text;
  existing uuid;
begin
  select roles, team_id, coalesce(nullif(trim(name), ''), 'Jugador')
    into t_roles, t_team, t_name
    from public.profiles where id = target;

  -- ¿Ficha ya vinculada a esta cuenta (en cualquier equipo)?
  select id into existing from public.players where profile_id = target limit 1;

  if not ('player' = any(coalesce(t_roles, '{}'::user_role[]))) then
    -- Perdió el rol de jugador: desvincula (no borra, para conservar stats).
    if existing is not null then
      update public.players set profile_id = null where id = existing;
    end if;
    return;
  end if;

  -- Es jugador pero sin equipo asignado: no tocamos su ficha (puede tener una
  -- vinculada manualmente, p. ej. un entrenador que también juega).
  if t_team is null then
    return;
  end if;

  if existing is not null then
    -- Mueve la ficha al equipo actual si cambió.
    update public.players set team_id = t_team where id = existing;
  else
    -- Crea la ficha en el equipo, evitando duplicar una ya vinculada por carrera.
    insert into public.players (team_id, name, profile_id)
      values (t_team, t_name, target)
      on conflict (team_id, profile_id) where profile_id is not null do nothing;
  end if;
end;
$$;
revoke all on function public.sync_player_ficha(uuid) from public;

-- Enganchar la sincronización en las funciones que cambian rol/equipo.
create or replace function public.add_member_role(target uuid, new_role text)
returns void language plpgsql security definer set search_path = public as $$
declare caller_admin boolean; caller_club uuid; target_club uuid; target_roles user_role[];
begin
  if not public.is_staff() then raise exception 'Solo el cuerpo técnico'; end if;
  if new_role not in ('admin','coach','tecnico','player') then raise exception 'Rol no válido'; end if;
  select ('admin' = any(roles) or is_superadmin), club_id into caller_admin, caller_club
    from public.profiles where id = auth.uid();
  select club_id, roles into target_club, target_roles from public.profiles where id = target;
  if target_club is distinct from caller_club then raise exception 'El usuario no pertenece a tu club'; end if;
  if not caller_admin then
    if new_role in ('admin','coach') then raise exception 'Un entrenador solo asigna jugador/técnico'; end if;
    if target_roles && array['admin','coach']::user_role[] then raise exception 'No puedes modificar a un admin/entrenador'; end if;
  end if;
  update public.profiles
    set roles = (case when new_role::user_role = any(roles) then roles else roles || new_role::user_role end)
    where id = target;
  update public.profiles set role = public.primary_role(roles) where id = target;
  perform public.sync_player_ficha(target);
end;
$$;

create or replace function public.remove_member_role(target uuid, old_role text)
returns void language plpgsql security definer set search_path = public as $$
declare caller_admin boolean; caller_club uuid; target_club uuid; target_roles user_role[];
begin
  if not public.is_staff() then raise exception 'Solo el cuerpo técnico'; end if;
  select ('admin' = any(roles) or is_superadmin), club_id into caller_admin, caller_club
    from public.profiles where id = auth.uid();
  select club_id, roles into target_club, target_roles from public.profiles where id = target;
  if target_club is distinct from caller_club then raise exception 'El usuario no pertenece a tu club'; end if;
  if target = auth.uid() and old_role = 'admin' then raise exception 'No puedes quitarte admin a ti mismo'; end if;
  if not caller_admin then
    if old_role in ('admin','coach') then raise exception 'Un entrenador solo gestiona jugador/técnico'; end if;
    if target_roles && array['admin','coach']::user_role[] then raise exception 'No puedes modificar a un admin/entrenador'; end if;
  end if;
  update public.profiles set roles = array_remove(roles, old_role::user_role) where id = target;
  update public.profiles set role = public.primary_role(roles) where id = target;
  perform public.sync_player_ficha(target);
end;
$$;

create or replace function public.set_member_team(target uuid, new_team uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  caller_admin boolean;
  caller_club uuid;
  target_club uuid;
  target_role text;
begin
  if not public.is_staff() then raise exception 'Solo el cuerpo técnico'; end if;

  select (role = 'admin' or is_superadmin), club_id into caller_admin, caller_club
    from public.profiles where id = auth.uid();
  select club_id, role::text into target_club, target_role
    from public.profiles where id = target;
  if target_club is distinct from caller_club then
    raise exception 'El usuario no pertenece a tu club';
  end if;

  if new_team is not null and not exists (
    select 1 from public.teams where id = new_team and club_id = caller_club
  ) then
    raise exception 'Equipo no válido';
  end if;

  if not caller_admin then
    if target_role in ('admin', 'coach') then
      raise exception 'No puedes modificar a un admin o entrenador';
    end if;
    if new_team is not null and not public.can_manage_team(new_team) then
      raise exception 'Solo puedes asignar a equipos que gestionas';
    end if;
  end if;

  update public.profiles set team_id = new_team where id = target;
  perform public.sync_player_ficha(target);
end;
$$;
revoke all on function public.set_member_team(uuid, uuid) from public;
grant execute on function public.set_member_team(uuid, uuid) to authenticated;
