-- =============================================================================
-- BMApp — Esquema de base de datos para Supabase (PostgreSQL)
-- Gestión de club de balonmano: clubs, perfiles, equipos, jugadores,
-- partidos y eventos de estadísticas in-game.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotente en la medida de lo posible (usa IF NOT EXISTS / DROP POLICY IF EXISTS).
-- =============================================================================

-- Extensiones -----------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- Generador de código de invitación de club (6 caracteres A-Z0-9) -------------
create or replace function public.gen_join_code()
returns text
language sql
volatile
as $$
  select upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
$$;

-- =============================================================================
-- 1. ENUMS
-- =============================================================================
do $$ begin
  create type user_role as enum ('admin', 'coach', 'player');
exception when duplicate_object then null; end $$;
-- Si el tipo ya existía sin 'player', añadirlo.
alter type user_role add value if not exists 'player';

do $$ begin
  create type match_status as enum ('scheduled', 'live', 'finished');
exception when duplicate_object then null; end $$;

do $$ begin
  create type stat_event_type as enum (
    'goal',           -- gol
    'miss',           -- fallo (tiro fuera / parado)
    'save',           -- parada (portero)
    'exclusion_2min', -- exclusión de 2 minutos
    'yellow_card',    -- tarjeta amarilla
    'red_card',       -- tarjeta roja
    'turnover',       -- pérdida de balón
    'assist'          -- asistencia
  );
exception when duplicate_object then null; end $$;

-- =============================================================================
-- 2. TABLAS
-- =============================================================================

-- Clubs -----------------------------------------------------------------------
create table if not exists public.clubs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  join_code  text unique not null default public.gen_join_code(),
  created_at timestamptz not null default now()
);

-- Profiles (1:1 con auth.users) -----------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  club_id       uuid references public.clubs (id) on delete set null,
  name          text not null default '',
  role          user_role not null default 'coach',
  -- Equipo del jugador (solo para role='player').
  -- FK añadida tras crear la tabla teams (ver más abajo) para evitar ref circular.
  team_id       uuid,
  -- Administrador GLOBAL (super-admin): acceso total a todos los clubs.
  -- Solo se activa por SQL (seed_superadmin.sql), nunca desde la app.
  is_superadmin boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists profiles_club_id_idx on public.profiles (club_id);
create index if not exists profiles_team_id_idx on public.profiles (team_id);

-- Teams -----------------------------------------------------------------------
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references public.clubs (id) on delete cascade,
  name       text not null,
  coach_id   uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists teams_club_id_idx  on public.teams (club_id);
create index if not exists teams_coach_id_idx on public.teams (coach_id);

-- FK diferida de profiles.team_id → teams (evita la referencia circular arriba).
do $$ begin
  alter table public.profiles
    add constraint profiles_team_id_fkey
    foreign key (team_id) references public.teams (id) on delete set null;
exception when duplicate_object then null; end $$;

-- Players ---------------------------------------------------------------------
create table if not exists public.players (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  name       text not null,
  number     int,
  position   text,
  created_at timestamptz not null default now()
);
create index if not exists players_team_id_idx on public.players (team_id);

-- Matches ---------------------------------------------------------------------
create table if not exists public.matches (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  opponent   text not null,
  date       timestamptz not null,
  location   text,
  status     match_status not null default 'scheduled',
  our_score  int not null default 0,
  opp_score  int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists matches_team_id_idx on public.matches (team_id);

-- Stats events ----------------------------------------------------------------
create table if not exists public.stats_events (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches (id) on delete cascade,
  player_id  uuid references public.players (id) on delete set null,  -- nullable: eventos de equipo
  event_type stat_event_type not null,
  -- "timestamp" del minuto de juego (segundos desde el inicio del partido)
  game_second int,
  created_at timestamptz not null default now()
);
create index if not exists stats_events_match_id_idx  on public.stats_events (match_id);
create index if not exists stats_events_player_id_idx on public.stats_events (player_id);

-- =============================================================================
-- 3. HELPERS de seguridad (SECURITY DEFINER para evitar recursión en RLS)
-- =============================================================================

-- Club del usuario actual
create or replace function public.current_club_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select club_id from public.profiles where id = auth.uid();
$$;

-- ¿El usuario actual es admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ¿El usuario actual es super-admin (administrador global)?
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

-- ¿El usuario actual gestiona este team_id?
--  - super-admin: cualquier equipo de cualquier club
--  - admin: cualquier equipo de su club
--  - coach: solo el/los equipo(s) donde profiles.id = teams.coach_id
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

-- ¿El usuario actual puede VER (solo lectura) los datos de un equipo?
--  - staff (admin/coach/superadmin): can_manage_team
--  - jugador: solo su equipo asignado (profiles.team_id)
create or replace function public.can_view_team(target_team uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_team(target_team) or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role::text = 'player'
      and p.team_id = target_team
  );
$$;

-- =============================================================================
-- 4. ROW LEVEL SECURITY
-- =============================================================================
alter table public.clubs        enable row level security;
alter table public.profiles     enable row level security;
alter table public.teams        enable row level security;
alter table public.players      enable row level security;
alter table public.matches      enable row level security;
alter table public.stats_events enable row level security;

-- ---- CLUBS ------------------------------------------------------------------
-- Miembros ven su club; el super-admin ve todos. Escribe el admin del club o el super-admin.
drop policy if exists clubs_select on public.clubs;
create policy clubs_select on public.clubs
  for select using (id = public.current_club_id() or public.is_superadmin());

drop policy if exists clubs_admin_write on public.clubs;
create policy clubs_admin_write on public.clubs
  for all
  using ((id = public.current_club_id() and public.is_admin()) or public.is_superadmin())
  with check ((id = public.current_club_id() and public.is_admin()) or public.is_superadmin());

-- ---- PROFILES ---------------------------------------------------------------
-- Cada uno ve su perfil; el admin ve los de su club; el super-admin ve todos.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or (club_id = public.current_club_id() and public.is_admin())
    or public.is_superadmin()
  );

-- NOTA de seguridad: NO existe una política de auto-UPDATE amplia sobre profiles.
-- Permitir `update using (id = auth.uid())` habilitaría a un coach a ponerse
-- role='admin' o cambiarse de club (escalada de privilegios). Los cambios de
-- perfil se hacen por vías controladas:
--   · Onboarding (crear club y volverse admin, una sola vez) → RPC create_club_and_become_admin()
--   · Editar el propio nombre                                → RPC update_my_name()
--   · Gestión completa dentro del club                       → policy profiles_admin_all (admin)
-- Ver funciones al final del archivo.
drop policy if exists profiles_self_update on public.profiles;

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all
  using ((club_id = public.current_club_id() and public.is_admin()) or public.is_superadmin())
  with check ((club_id = public.current_club_id() and public.is_admin()) or public.is_superadmin());

-- ---- TEAMS ------------------------------------------------------------------
-- Lectura: miembros del club (o super-admin). Escritura: admin del club o super-admin.
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams
  for select using (club_id = public.current_club_id() or public.is_superadmin());

drop policy if exists teams_admin_write on public.teams;
create policy teams_admin_write on public.teams
  for all
  using ((club_id = public.current_club_id() and public.is_admin()) or public.is_superadmin())
  with check ((club_id = public.current_club_id() and public.is_admin()) or public.is_superadmin());

-- ---- PLAYERS ----------------------------------------------------------------
-- Lectura: staff de ese equipo + jugador de ese equipo (can_view_team).
-- Escritura: solo staff que gestiona el equipo (can_manage_team).
drop policy if exists players_select on public.players;
create policy players_select on public.players
  for select using (public.can_view_team(team_id));

drop policy if exists players_write on public.players;
create policy players_write on public.players
  for all
  using (public.can_manage_team(team_id))
  with check (public.can_manage_team(team_id));

-- ---- MATCHES ----------------------------------------------------------------
drop policy if exists matches_select on public.matches;
create policy matches_select on public.matches
  for select using (public.can_view_team(team_id));

drop policy if exists matches_write on public.matches;
create policy matches_write on public.matches
  for all
  using (public.can_manage_team(team_id))
  with check (public.can_manage_team(team_id));

-- ---- STATS_EVENTS -----------------------------------------------------------
-- Se autoriza a través del partido → equipo. Se comprueba can_manage_team
-- del team dueño del match asociado al evento.
drop policy if exists stats_events_select on public.stats_events;
create policy stats_events_select on public.stats_events
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and public.can_view_team(m.team_id)
    )
  );

drop policy if exists stats_events_write on public.stats_events;
create policy stats_events_write on public.stats_events
  for all
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and public.can_manage_team(m.team_id)
    )
  )
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_id and public.can_manage_team(m.team_id)
    )
  );

-- =============================================================================
-- 5. TRIGGER: crear profile automáticamente al registrarse un usuario
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    'coach'  -- por defecto coach; el admin ajusta rol/club después
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 6. RPCs de onboarding y perfil (vías controladas de escritura)
-- =============================================================================

-- Crear un club nuevo y convertirse en su admin.
-- Solo permitido si el usuario aún no pertenece a ningún club (onboarding único).
-- Siempre crea un club NUEVO (no permite auto-unirse a clubs ajenos).
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

revoke all on function public.create_club_and_become_admin(text) from public;
grant execute on function public.create_club_and_become_admin(text) to authenticated;

-- Actualizar únicamente el nombre del propio perfil (no toca role ni club_id).
create or replace function public.update_my_name(new_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
    set name = coalesce(nullif(trim(new_name), ''), name)
    where id = auth.uid();
end;
$$;

revoke all on function public.update_my_name(text) from public;
grant execute on function public.update_my_name(text) to authenticated;

-- Unirse a un club existente con su código, eligiendo rol (coach o player).
-- Solo si el usuario aún no pertenece a ningún club.
drop function if exists public.join_club_with_code(text);
create or replace function public.join_club_with_code(code text, join_as text default 'coach')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_club uuid;
  current_club uuid;
  new_role user_role;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if join_as not in ('coach', 'player') then
    raise exception 'Rol no válido';
  end if;
  new_role := join_as::user_role;

  select club_id into current_club from public.profiles where id = auth.uid();
  if current_club is not null then
    raise exception 'Ya perteneces a un club';
  end if;

  select id into target_club
    from public.clubs
    where join_code = upper(trim(code));

  if target_club is null then
    raise exception 'Código de club no válido';
  end if;

  update public.profiles
    set club_id = target_club, role = new_role
    where id = auth.uid();

  return target_club;
end;
$$;

revoke all on function public.join_club_with_code(text, text) from public;
grant execute on function public.join_club_with_code(text, text) to authenticated;

-- Expulsar a un miembro del club (solo admin). Lo desasigna de sus equipos.
create or replace function public.remove_member(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador puede expulsar miembros';
  end if;
  if target = auth.uid() then
    raise exception 'No puedes expulsarte a ti mismo';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = target and club_id = public.current_club_id()
  ) then
    raise exception 'El usuario no pertenece a tu club';
  end if;

  update public.teams
    set coach_id = null
    where coach_id = target and club_id = public.current_club_id();

  update public.profiles
    set club_id = null, role = 'coach'
    where id = target;
end;
$$;

revoke all on function public.remove_member(uuid) from public;
grant execute on function public.remove_member(uuid) to authenticated;

-- =============================================================================
-- FIN
-- =============================================================================
