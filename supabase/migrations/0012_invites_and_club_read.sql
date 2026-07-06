-- =============================================================================
-- BMApp — Migración 0012: invitaciones con rol/equipo + lectura de todo el club
-- Ejecutar sobre una BD con 0001–0011 aplicadas.
-- =============================================================================

-- 1) LECTURA: cualquier miembro del club ve TODO lo del club (todas sus tablas
--    ya usan can_view_team para el SELECT). La escritura no cambia.
create or replace function public.can_view_team(target_team uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_superadmin() or exists (
    select 1 from public.teams t
    where t.id = target_team and t.club_id = public.current_club_id()
  );
$$;

-- 2) INVITACIONES: cada código lleva un rol (y opcionalmente un equipo).
create table if not exists public.invites (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references public.clubs (id) on delete cascade,
  code       text unique not null default public.gen_join_code(),
  role       user_role not null,
  team_id    uuid references public.teams (id) on delete set null,
  label      text,
  created_at timestamptz not null default now(),
  constraint invites_role_chk check (role in ('player', 'coach', 'tecnico'))
);
create index if not exists invites_club_id_idx on public.invites (club_id);

alter table public.invites enable row level security;

-- Solo el admin del club (o superadmin) gestiona las invitaciones.
drop policy if exists invites_admin_all on public.invites;
create policy invites_admin_all on public.invites
  for all
  using ((club_id = public.current_club_id() and public.is_admin()) or public.is_superadmin())
  with check ((club_id = public.current_club_id() and public.is_admin()) or public.is_superadmin());

-- 3) Unirse con una invitación: asigna club + rol + equipo del invite.
create or replace function public.join_with_invite(invite_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  inv public.invites;
  current_club uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;

  select club_id into current_club from public.profiles where id = auth.uid();
  if current_club is not null then raise exception 'Ya perteneces a un club'; end if;

  select * into inv from public.invites where code = upper(trim(invite_code));
  if inv.id is null then raise exception 'Invitación no válida'; end if;

  update public.profiles
    set club_id = inv.club_id, role = inv.role, team_id = inv.team_id
    where id = auth.uid();

  return inv.club_id;
end;
$$;
revoke all on function public.join_with_invite(text) from public;
grant execute on function public.join_with_invite(text) to authenticated;
