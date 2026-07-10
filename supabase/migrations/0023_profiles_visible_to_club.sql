-- "Cualquiera puede ver una ficha": permitir a cualquier miembro del club leer
-- los perfiles de su mismo club (antes un miembro normal solo veía el suyo, y el
-- staff solo a los jugadores). La escritura sigue restringida (RPCs / admin).

drop policy if exists profiles_select_club on public.profiles;
create policy profiles_select_club on public.profiles
  for select
  using (club_id = public.current_club_id());
