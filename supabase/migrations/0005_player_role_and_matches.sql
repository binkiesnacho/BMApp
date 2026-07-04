-- =============================================================================
-- BMApp — Migración 0005: rol "jugador" (solo lectura) + marcadores de partido
-- Ejecutar en Supabase → SQL Editor sobre una BD con 0001–0004 aplicadas.
-- =============================================================================

-- 1) Nuevo valor de rol: 'player' (jugador, acceso de solo lectura).
--    IF NOT EXISTS evita error si se re-ejecuta. Las funciones comparan por
--    ::text para no depender de que el valor esté "committed" en la misma tx.
alter type user_role add value if not exists 'player';

-- 2) Un jugador pertenece a un equipo concreto (para saber qué ve).
alter table public.profiles
  add column if not exists team_id uuid references public.teams (id) on delete set null;
create index if not exists profiles_team_id_idx on public.profiles (team_id);

-- 3) Marcador del partido (perspectiva de nuestro equipo).
alter table public.matches
  add column if not exists our_score int not null default 0;
alter table public.matches
  add column if not exists opp_score int not null default 0;

-- 4) Helper de LECTURA: quién puede ver los datos de un equipo.
--    - staff (admin/coach/superadmin): can_manage_team
--    - jugador: solo su equipo (profiles.team_id)
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

-- 5) Políticas de SELECT ampliadas al jugador (escritura sigue en can_manage_team).
drop policy if exists players_select on public.players;
create policy players_select on public.players
  for select using (public.can_view_team(team_id));

drop policy if exists matches_select on public.matches;
create policy matches_select on public.matches
  for select using (public.can_view_team(team_id));

drop policy if exists stats_events_select on public.stats_events;
create policy stats_events_select on public.stats_events
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and public.can_view_team(m.team_id)
    )
  );

-- 6) Unirse a un club con código, eligiendo rol (coach o player).
--    Se reemplaza la versión de 1 argumento por otra con rol.
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

  select id into target_club from public.clubs where join_code = upper(trim(code));
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
