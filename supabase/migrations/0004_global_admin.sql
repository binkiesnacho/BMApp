-- =============================================================================
-- BMApp — Migración 0004: administrador GLOBAL (super-admin)
-- Ejecutar en Supabase → SQL Editor sobre una BD con 0001–0003 aplicadas.
--
-- Modelo de roles resultante:
--   · super-admin (profiles.is_superadmin = true): acceso total a TODOS los
--     clubs. Solo tú. Único que puede crear clubs.
--   · admin (profiles.role = 'admin'): administra SU club (delegable).
--   · coach (profiles.role = 'coach'): solo su(s) equipo(s).
-- =============================================================================

-- 1) Columna de super-admin.
alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;

-- 2) Helper: ¿el usuario actual es super-admin?
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_superadmin = true
  );
$$;

-- 3) can_manage_team ahora concede acceso también al super-admin.
create or replace function public.can_manage_team(target_team uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_superadmin() or exists (
    select 1
    from public.teams t
    join public.profiles p on p.id = auth.uid()
    where t.id = target_team
      and t.club_id = p.club_id
      and (p.role = 'admin' or t.coach_id = p.id)
  );
$$;

-- 4) Políticas: el super-admin pasa por encima del scope de club.
--    (players/matches/stats usan can_manage_team → ya cubierto por el punto 3.)

drop policy if exists clubs_select on public.clubs;
create policy clubs_select on public.clubs
  for select using (id = public.current_club_id() or public.is_superadmin());

drop policy if exists clubs_admin_write on public.clubs;
create policy clubs_admin_write on public.clubs
  for all
  using ((id = public.current_club_id() and public.is_admin()) or public.is_superadmin())
  with check ((id = public.current_club_id() and public.is_admin()) or public.is_superadmin());

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or (club_id = public.current_club_id() and public.is_admin())
    or public.is_superadmin()
  );

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all
  using ((club_id = public.current_club_id() and public.is_admin()) or public.is_superadmin())
  with check ((club_id = public.current_club_id() and public.is_admin()) or public.is_superadmin());

drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams
  for select using (club_id = public.current_club_id() or public.is_superadmin());

drop policy if exists teams_admin_write on public.teams;
create policy teams_admin_write on public.teams
  for all
  using ((club_id = public.current_club_id() and public.is_admin()) or public.is_superadmin())
  with check ((club_id = public.current_club_id() and public.is_admin()) or public.is_superadmin());

-- 5) Crear clubs queda restringido al super-admin.
create or replace function public.create_club_and_become_admin(club_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_club_id uuid;
  current_club uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if not public.is_superadmin() then
    raise exception 'Solo el administrador global puede crear clubs';
  end if;

  select club_id into current_club from public.profiles where id = auth.uid();
  if current_club is not null then
    raise exception 'Ya perteneces a un club';
  end if;

  if coalesce(trim(club_name), '') = '' then
    raise exception 'El nombre del club es obligatorio';
  end if;

  insert into public.clubs (name)
    values (trim(club_name))
    returning id into new_club_id;

  update public.profiles
    set club_id = new_club_id, role = 'admin'
    where id = auth.uid();

  return new_club_id;
end;
$$;
