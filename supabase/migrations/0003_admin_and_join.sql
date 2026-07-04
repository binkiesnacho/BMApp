-- =============================================================================
-- BMApp — Migración 0003: panel de administración + código de club (join code)
-- Ejecutar en Supabase → SQL Editor sobre una BD con 0001 y 0002 aplicadas.
-- =============================================================================

-- 1) Generador de código de invitación (6 caracteres A-Z0-9).
create or replace function public.gen_join_code()
returns text
language sql
volatile
as $$
  select upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
$$;

-- 2) Columna join_code en clubs (backfill de clubs existentes + default + not null).
alter table public.clubs add column if not exists join_code text;
update public.clubs set join_code = public.gen_join_code() where join_code is null;
alter table public.clubs alter column join_code set default public.gen_join_code();

do $$ begin
  alter table public.clubs add constraint clubs_join_code_key unique (join_code);
exception when duplicate_table then null; when duplicate_object then null; end $$;

alter table public.clubs alter column join_code set not null;

-- 3) RPC: unirse a un club existente con código (como entrenador).
create or replace function public.join_club_with_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_club uuid;
  current_club uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

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
    set club_id = target_club, role = 'coach'
    where id = auth.uid();

  return target_club;
end;
$$;

revoke all on function public.join_club_with_code(text) from public;
grant execute on function public.join_club_with_code(text) to authenticated;

-- 4) RPC: expulsar a un miembro del club (solo admin). Lo desasigna de equipos.
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
