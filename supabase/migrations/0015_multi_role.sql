-- =============================================================================
-- BMApp — Migración 0015: roles múltiples por usuario (profiles.roles[])
-- El usuario puede tener varios roles (admin/coach/tecnico/player) a la vez.
-- Se mantiene profiles.role como "rol principal" (para compatibilidad/orden).
-- Ejecutar sobre una BD con 0001–0014 aplicadas.
-- =============================================================================

alter table public.profiles
  add column if not exists roles user_role[] not null default '{}';

-- Backfill: cada perfil arranca con su rol actual.
update public.profiles set roles = array[role] where cardinality(roles) = 0;

-- Rol principal (para mostrar orden / mantener profiles.role sincronizado).
create or replace function public.primary_role(rs user_role[])
returns user_role language sql immutable as $$
  select case
    when 'admin'   = any(rs) then 'admin'::user_role
    when 'coach'   = any(rs) then 'coach'::user_role
    when 'tecnico' = any(rs) then 'tecnico'::user_role
    else 'player'::user_role
  end;
$$;

-- ---- Helpers de permisos ahora leen el ARRAY de roles -----------------------

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and 'admin' = any(roles)
  );
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_superadmin() or exists (
    select 1 from public.profiles
    where id = auth.uid() and (roles && array['admin','coach']::user_role[])
  );
$$;

create or replace function public.can_manage_team(target_team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_superadmin() or exists (
    select 1
    from public.teams t
    join public.profiles p on p.id = auth.uid()
    where t.id = target_team
      and t.club_id = p.club_id
      and ('admin' = any(p.roles) or t.coach_id = p.id)
  );
$$;

create or replace function public.can_capture_team(target_team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_manage_team(target_team) or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and 'tecnico' = any(p.roles) and p.team_id = target_team
  );
$$;

-- profiles_select: el staff del club ve las cuentas con rol player del club.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or (club_id = public.current_club_id() and public.is_admin())
    or public.is_superadmin()
    or ('player' = any(roles) and club_id = public.current_club_id() and public.is_staff())
  );

-- ---- Onboarding / invites: rellenan roles[] además de role -------------------

create or replace function public.create_club_and_become_admin(club_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_club_id uuid; current_club uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if not public.is_superadmin() then raise exception 'Solo el administrador global puede crear clubs'; end if;
  select club_id into current_club from public.profiles where id = auth.uid();
  if current_club is not null then raise exception 'Ya perteneces a un club'; end if;
  if coalesce(trim(club_name), '') = '' then raise exception 'El nombre del club es obligatorio'; end if;
  insert into public.clubs (name) values (trim(club_name)) returning id into new_club_id;
  update public.profiles
    set club_id = new_club_id, role = 'admin', roles = array['admin']::user_role[]
    where id = auth.uid();
  return new_club_id;
end;
$$;

create or replace function public.join_with_invite(invite_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv public.invites; current_club uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  select club_id into current_club from public.profiles where id = auth.uid();
  if current_club is not null then raise exception 'Ya perteneces a un club'; end if;
  select * into inv from public.invites where code = upper(trim(invite_code));
  if inv.id is null then raise exception 'Invitación no válida'; end if;
  update public.profiles
    set club_id = inv.club_id, role = inv.role, roles = array[inv.role],
        team_id = inv.team_id
    where id = auth.uid();
  return inv.club_id;
end;
$$;

-- ---- RPCs de gestión: añadir / quitar roles ---------------------------------

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
end;
$$;
revoke all on function public.add_member_role(uuid, text) from public;
grant execute on function public.add_member_role(uuid, text) to authenticated;

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
  update public.profiles
    set roles = array_remove(roles, old_role::user_role)
    where id = target;
  update public.profiles set role = public.primary_role(roles) where id = target;
end;
$$;
revoke all on function public.remove_member_role(uuid, text) from public;
grant execute on function public.remove_member_role(uuid, text) to authenticated;
