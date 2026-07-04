-- =============================================================================
-- BMApp — Migración 0008: el staff puede ver los perfiles de jugador de su equipo
-- (necesario para vincular cuentas ↔ ficha del roster desde el coach)
-- Ejecutar sobre una BD con 0001–0007 aplicadas.
-- =============================================================================

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or (club_id = public.current_club_id() and public.is_admin())
    or public.is_superadmin()
    -- staff (coach/admin/superadmin) ve las cuentas de jugador de su(s) equipo(s)
    or (role::text = 'player' and public.can_manage_team(team_id))
  );
