-- =============================================================================
-- BMApp — Migración 0009: jugadores en varios equipos
-- Un jugador (cuenta) puede tener ficha de roster en varios equipos (p.ej.
-- Cadete + Juvenil, Juvenil + Senior). Su acceso deriva de esas fichas.
-- Ejecutar sobre una BD con 0001–0008 aplicadas.
-- =============================================================================

-- 1) Una cuenta ya NO se limita a una única ficha: puede tener una por equipo.
drop index if exists public.players_profile_id_uidx;
create unique index if not exists players_team_profile_uidx
  on public.players (team_id, profile_id)
  where profile_id is not null;

-- 2) Helper: ¿el usuario actual es staff (admin/coach/superadmin)?
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_superadmin() or exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'coach')
  );
$$;

-- 3) can_view_team ahora también concede acceso por ficha de roster vinculada.
--    Así un jugador ve TODOS los equipos donde está en el roster.
create or replace function public.can_view_team(target_team uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.can_manage_team(target_team)
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role::text = 'player'
        and p.team_id = target_team
    )
    or exists (
      select 1 from public.players pl
      where pl.profile_id = auth.uid()
        and pl.team_id = target_team
    );
$$;

-- 4) El staff del club ve todas las cuentas de jugador del club (para poder
--    vincularlas a cualquiera de sus equipos, no solo a "su" equipo asignado).
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or (club_id = public.current_club_id() and public.is_admin())
    or public.is_superadmin()
    or (role::text = 'player' and club_id = public.current_club_id() and public.is_staff())
  );
