-- Pertenencia a equipos multi-equipo y con varios entrenadores por equipo.
--   * Entrenadores: nueva tabla join team_coaches (varios por equipo; una persona
--     puede entrenar varios equipos). Se mantiene teams.coach_id como legado.
--   * Jugadores: ya soportado por la tabla players (una fila por equipo).
-- RPCs de asignación (SECURITY DEFINER) para asignar desde el equipo o la ficha.

create table if not exists public.team_coaches (
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, profile_id)
);

alter table public.team_coaches enable row level security;

-- Lectura: cualquier miembro del mismo club. Escritura: solo vía RPC.
drop policy if exists team_coaches_read on public.team_coaches;
create policy team_coaches_read on public.team_coaches for select
  using (
    exists (
      select 1 from public.teams t join public.profiles p on p.id = auth.uid()
      where t.id = team_coaches.team_id and t.club_id = p.club_id
    )
  );

-- Backfill desde el entrenador único actual.
insert into public.team_coaches (team_id, profile_id)
  select id, coach_id from public.teams where coach_id is not null
  on conflict do nothing;

-- ¿Puede gestionar el equipo? admin, coach_id legado o miembro de team_coaches.
create or replace function public.can_manage_team(target_team uuid)
 returns boolean
 language sql stable security definer set search_path to 'public'
as $function$
  select public.is_superadmin() or exists (
    select 1
    from public.teams t
    join public.profiles p on p.id = auth.uid()
    where t.id = target_team
      and t.club_id = p.club_id
      and (
        'admin' = any(p.roles)
        or t.coach_id = p.id
        or exists (
          select 1 from public.team_coaches tc
          where tc.team_id = t.id and tc.profile_id = p.id
        )
      )
  );
$function$;

-- Asignar / quitar ENTRENADOR de un equipo (solo admin del club).
create or replace function public.set_team_coach(target_team uuid, target_profile uuid, present boolean)
 returns void
 language plpgsql security definer set search_path to 'public'
as $function$
declare caller_club uuid; t_club uuid; p_club uuid;
begin
  if not public.is_admin() then raise exception 'Solo el administrador'; end if;
  select club_id into caller_club from public.profiles where id = auth.uid();
  select club_id into t_club from public.teams where id = target_team;
  select club_id into p_club from public.profiles where id = target_profile;
  if t_club is distinct from caller_club or p_club is distinct from caller_club then
    raise exception 'Fuera de tu club';
  end if;

  if present then
    insert into public.team_coaches(team_id, profile_id)
      values (target_team, target_profile) on conflict do nothing;
    update public.profiles
      set roles = (case when 'coach' = any(roles) then roles else roles || 'coach'::user_role end)
      where id = target_profile;
  else
    delete from public.team_coaches where team_id = target_team and profile_id = target_profile;
    update public.teams set coach_id = null
      where id = target_team and coach_id = target_profile;
    -- Si ya no entrena ningún equipo, retira el rol coach.
    if not exists (select 1 from public.team_coaches where profile_id = target_profile)
       and not exists (select 1 from public.teams where coach_id = target_profile) then
      update public.profiles set roles = array_remove(roles, 'coach'::user_role) where id = target_profile;
    end if;
  end if;
  update public.profiles set role = public.primary_role(roles) where id = target_profile;
end;
$function$;

-- Asignar / quitar JUGADOR de un equipo (admin o entrenador del equipo).
create or replace function public.set_team_player(target_team uuid, target_profile uuid, present boolean)
 returns void
 language plpgsql security definer set search_path to 'public'
as $function$
declare caller_club uuid; t_club uuid; p_club uuid; p_name text; pl_id uuid;
begin
  if not (public.is_admin() or public.can_manage_team(target_team)) then
    raise exception 'Sin permisos sobre este equipo';
  end if;
  select club_id into caller_club from public.profiles where id = auth.uid();
  select club_id into t_club from public.teams where id = target_team;
  select club_id, coalesce(nullif(trim(name), ''), 'Jugador')
    into p_club, p_name from public.profiles where id = target_profile;
  if t_club is distinct from caller_club or p_club is distinct from caller_club then
    raise exception 'Fuera de tu club';
  end if;

  if present then
    insert into public.players(team_id, name, profile_id)
      values (target_team, p_name, target_profile)
      on conflict (team_id, profile_id) where profile_id is not null do nothing;
    update public.profiles
      set roles = (case when 'player' = any(roles) then roles else roles || 'player'::user_role end)
      where id = target_profile;
  else
    select id into pl_id from public.players
      where team_id = target_team and profile_id = target_profile;
    if pl_id is not null then
      -- Conserva la ficha (desvinculada) si tiene histórico; si no, la elimina.
      if exists (select 1 from public.stats_events where player_id = pl_id)
         or exists (select 1 from public.training_attendance where player_id = pl_id) then
        update public.players set profile_id = null where id = pl_id;
      else
        delete from public.players where id = pl_id;
      end if;
    end if;
    if not exists (select 1 from public.players where profile_id = target_profile) then
      update public.profiles set roles = array_remove(roles, 'player'::user_role) where id = target_profile;
    end if;
  end if;
  update public.profiles set role = public.primary_role(roles) where id = target_profile;
end;
$function$;
