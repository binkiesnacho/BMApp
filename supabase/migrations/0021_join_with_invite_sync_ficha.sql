-- Al unirse por invitación, sincronizar la ficha del jugador en el roster.
-- Antes join_with_invite asignaba rol y equipo pero NO llamaba a
-- sync_player_ficha (como sí hacen add_member_role / set_member_team), por lo
-- que un jugador que entraba por invitación no obtenía su ficha: no aparecía en
-- la plantilla, "Mi ficha" no funcionaba y no contaba para asistencia/faltas.

CREATE OR REPLACE FUNCTION public.join_with_invite(invite_code text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare inv public.invites; current_club uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  select club_id into current_club from public.profiles where id = auth.uid();
  if current_club is not null then raise exception 'Ya perteneces a un club'; end if;
  select * into inv from public.invites where code = upper(trim(invite_code));
  if inv.id is null then raise exception 'Invitación no válida'; end if;
  update public.profiles
    set club_id = inv.club_id, role = inv.role, roles = array[inv.role],
        team_id = inv.team_id
    where id = auth.uid();
  -- Crea/actualiza la ficha del jugador si el rol es 'player' y hay equipo.
  perform public.sync_player_ficha(auth.uid());
  return inv.club_id;
end;
$function$;
