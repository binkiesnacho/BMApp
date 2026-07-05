-- =============================================================================
-- BMApp — Migración 0010: rol "técnico" + gestión de miembros por el entrenador
--
-- Técnico: ve lo mismo que un entrenador de su equipo, pero SOLO puede escribir
--          estadísticas en vivo y crear/gestionar entrenamientos. El resto,
--          consulta. Se asigna a un equipo vía profiles.team_id (como el jugador).
-- Entrenador: puede cambiar el rol de jugadores/técnicos y asignarles equipo
--             (vía RPCs seguras), pero nunca crear/editar admins ni entrenadores.
-- Ejecutar sobre una BD con 0001–0009 aplicadas.
-- =============================================================================

alter type user_role add value if not exists 'tecnico';

-- ---- Helpers ----------------------------------------------------------------

-- ¿El usuario puede CAPTURAR en un equipo? (estadísticas en vivo + entrenamientos)
--   staff (admin/coach/superadmin) via can_manage_team, o técnico asignado.
create or replace function public.can_capture_team(target_team uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.can_manage_team(target_team) or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role::text = 'tecnico' and p.team_id = target_team
  );
$$;

-- Lectura: capturadores (staff+técnico) + jugador (por team_id o ficha de roster).
create or replace function public.can_view_team(target_team uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    public.can_capture_team(target_team)
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text = 'player' and p.team_id = target_team
    )
    or exists (
      select 1 from public.players pl
      where pl.profile_id = auth.uid() and pl.team_id = target_team
    );
$$;

-- ---- MATCHES: escritura separada por comando ---------------------------------
-- select: quien ve el equipo. insert/delete: staff. update: staff o técnico
-- (para guardar el marcador/estado desde el modo en vivo).
drop policy if exists matches_write on public.matches;
drop policy if exists matches_select on public.matches;
create policy matches_select on public.matches
  for select using (public.can_view_team(team_id));
create policy matches_insert on public.matches
  for insert with check (public.can_manage_team(team_id));
create policy matches_update on public.matches
  for update using (public.can_capture_team(team_id))
  with check (public.can_capture_team(team_id));
create policy matches_delete on public.matches
  for delete using (public.can_manage_team(team_id));

-- ---- STATS_EVENTS: escritura por capturador ---------------------------------
drop policy if exists stats_events_write on public.stats_events;
create policy stats_events_write on public.stats_events
  for all
  using (exists (select 1 from public.matches m where m.id = match_id and public.can_capture_team(m.team_id)))
  with check (exists (select 1 from public.matches m where m.id = match_id and public.can_capture_team(m.team_id)));

-- ---- TRAININGS + ATTENDANCE: escritura por capturador ------------------------
drop policy if exists trainings_write on public.trainings;
create policy trainings_write on public.trainings
  for all
  using (public.can_capture_team(team_id))
  with check (public.can_capture_team(team_id));

drop policy if exists training_attendance_write on public.training_attendance;
create policy training_attendance_write on public.training_attendance
  for all
  using (exists (select 1 from public.trainings t where t.id = training_id and public.can_capture_team(t.team_id)))
  with check (exists (select 1 from public.trainings t where t.id = training_id and public.can_capture_team(t.team_id)));

-- ---- RPCs: gestión de miembros por staff (coach incluido, con límites) -------

-- Cambia el rol de un miembro del club.
--  · admin/superadmin: cualquier rol.
--  · entrenador: solo puede fijar player/tecnico y solo sobre miembros que no
--    sean admin/entrenador. Nunca sobre sí mismo.
create or replace function public.set_member_role(target uuid, new_role text)
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
  if target = auth.uid() then raise exception 'No puedes cambiar tu propio rol'; end if;
  if new_role not in ('admin', 'coach', 'tecnico', 'player') then
    raise exception 'Rol no válido';
  end if;

  select (role = 'admin' or is_superadmin), club_id into caller_admin, caller_club
    from public.profiles where id = auth.uid();
  select club_id, role::text into target_club, target_role
    from public.profiles where id = target;
  if target_club is distinct from caller_club then
    raise exception 'El usuario no pertenece a tu club';
  end if;

  if not caller_admin then
    -- El entrenador no toca admins/entrenadores ni asigna esos roles.
    if new_role in ('admin', 'coach') then
      raise exception 'Un entrenador no puede asignar el rol admin/entrenador';
    end if;
    if target_role in ('admin', 'coach') then
      raise exception 'No puedes modificar a un admin o entrenador';
    end if;
  end if;

  update public.profiles
    set role = new_role::user_role,
        team_id = case when new_role in ('player', 'tecnico') then team_id else null end
    where id = target;
end;
$$;
revoke all on function public.set_member_role(uuid, text) from public;
grant execute on function public.set_member_role(uuid, text) to authenticated;

-- Asigna (o quita) el equipo de un player/tecnico.
--  · admin/superadmin: cualquier equipo del club.
--  · entrenador: solo equipos que gestiona; y no sobre admins/entrenadores.
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
end;
$$;
revoke all on function public.set_member_team(uuid, uuid) from public;
grant execute on function public.set_member_team(uuid, uuid) to authenticated;
