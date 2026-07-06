-- =============================================================================
-- BMApp — Migración 0013: los entrenadores pueden invitar a SU equipo
-- (solo roles jugador/técnico). El admin sigue pudiendo invitar cualquier rol.
-- Ejecutar sobre una BD con 0001–0012 aplicadas.
-- =============================================================================

drop policy if exists invites_admin_all on public.invites;

-- Ver: admin ve todas las del club; el entrenador, las de sus equipos.
drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites
  for select using (
    public.is_superadmin()
    or (club_id = public.current_club_id() and public.is_admin())
    or (team_id is not null and public.can_manage_team(team_id))
  );

-- Crear: admin cualquier rol; entrenador solo player/tecnico y a un equipo suyo.
drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites
  for insert with check (
    public.is_superadmin()
    or (club_id = public.current_club_id() and public.is_admin())
    or (
      club_id = public.current_club_id()
      and role::text in ('player', 'tecnico')
      and team_id is not null
      and public.can_manage_team(team_id)
    )
  );

-- Borrar: mismas reglas que ver.
drop policy if exists invites_delete on public.invites;
create policy invites_delete on public.invites
  for delete using (
    public.is_superadmin()
    or (club_id = public.current_club_id() and public.is_admin())
    or (team_id is not null and public.can_manage_team(team_id))
  );
