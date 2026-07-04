-- =============================================================================
-- BMApp — Migración 0002: onboarding + seguridad de perfiles
-- Ejecutar en Supabase → SQL Editor sobre una BD que ya tiene schema.sql (0001).
-- =============================================================================

-- 1) SEGURIDAD: eliminar la política de auto-UPDATE de profiles.
--    Permitía a un coach ponerse role='admin' o cambiarse de club.
drop policy if exists profiles_self_update on public.profiles;

-- 2) RPC de onboarding: crear club y volverse su admin (una sola vez).
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

-- 3) RPC para editar solo el propio nombre (sin tocar role/club_id).
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
