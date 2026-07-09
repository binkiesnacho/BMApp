import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Club, Profile, Team, UserRole } from "@/lib/types/database";

/**
 * Equipos "de la persona": donde es entrenador (coach_id), donde tiene ficha de
 * roster vinculada, o el que tiene asignado (profiles.team_id). Ordenados.
 * Memoizado por petición (cache) para no repetir queries entre layout y página.
 */
export const getMyTeams = cache(async function getMyTeams(): Promise<Team[]> {
  const { profile } = await getSessionProfile();
  if (!profile?.club_id) return [];
  const supabase = await createClient();

  const [{ data: coached }, { data: rosterRows }, { data: coachRows }] =
    await Promise.all([
      supabase.from("teams").select("*").eq("coach_id", profile.id).returns<Team[]>(),
      supabase
        .from("players")
        .select("team_id")
        .eq("profile_id", profile.id)
        .returns<{ team_id: string }[]>(),
      supabase
        .from("team_coaches")
        .select("team_id")
        .eq("profile_id", profile.id)
        .returns<{ team_id: string }[]>(),
    ]);

  const ids = new Set<string>();
  (coached ?? []).forEach((t) => ids.add(t.id));
  (rosterRows ?? []).forEach((r) => ids.add(r.team_id));
  (coachRows ?? []).forEach((r) => ids.add(r.team_id));
  if (profile.team_id) ids.add(profile.team_id);

  if (ids.size === 0) return [];
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .in("id", [...ids])
    .order("name", { ascending: true })
    .returns<Team[]>();
  return teams ?? [];
});

/** Ids de los equipos que ENTRENO (team_coaches + coach_id legado). Memoizado. */
export const getMyCoachTeamIds = cache(async function getMyCoachTeamIds(): Promise<
  Set<string>
> {
  const { profile } = await getSessionProfile();
  const s = new Set<string>();
  if (!profile?.id) return s;
  const supabase = await createClient();
  const [{ data: tc }, { data: legacy }] = await Promise.all([
    supabase
      .from("team_coaches")
      .select("team_id")
      .eq("profile_id", profile.id)
      .returns<{ team_id: string }[]>(),
    supabase
      .from("teams")
      .select("id")
      .eq("coach_id", profile.id)
      .returns<{ id: string }[]>(),
  ]);
  (tc ?? []).forEach((r) => s.add(r.team_id));
  (legacy ?? []).forEach((r) => s.add(r.id));
  return s;
});

/**
 * Id de "mi ficha" de jugador (players.profile_id = yo). Si tengo ficha en
 * varios equipos, devuelve la primera. null si no tengo ficha vinculada.
 */
export const getMyFichaId = cache(async function getMyFichaId(): Promise<
  string | null
> {
  const { profile } = await getSessionProfile();
  if (!profile?.id) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("players")
    .select("id")
    .eq("profile_id", profile.id)
    .limit(1)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
});

/** Club del usuario actual (o null). */
export const getMyClub = cache(async function getMyClub(): Promise<Club | null> {
  const { profile } = await getSessionProfile();
  if (!profile?.club_id) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("clubs")
    .select("*")
    .eq("id", profile.club_id)
    .maybeSingle<Club>();
  return data ?? null;
});

/**
 * Devuelve el usuario autenticado y su perfil (o null si no hay sesión).
 * Uso en Server Components / Server Actions. Memoizado por petición (cache):
 * evita repetir auth.getUser() + la query de perfil en cada llamada.
 */
export const getSessionProfile = cache(async function getSessionProfile() {
  const supabase = await createClient();

  // getClaims valida el JWT (localmente si hay claves asimétricas) sin una ida y
  // vuelta de red por cada render. El proxy ya refresca/verifica la sesión.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;

  if (!userId) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single<Profile>();

  return { user: { id: userId }, profile: profile ?? null };
});

/** Roles del perfil (array, con fallback al rol principal). */
export function rolesOf(profile: Profile | null): UserRole[] {
  if (!profile) return [];
  if (profile.roles && profile.roles.length > 0) return profile.roles;
  return profile.role ? [profile.role] : [];
}

/** ¿Tiene permisos de administración (rol admin o admin global)? */
export function canAdminister(profile: Profile | null): boolean {
  return (
    !!profile && (rolesOf(profile).includes("admin") || profile.is_superadmin)
  );
}

/**
 * ¿Puede gestionar ESTE equipo? (espejo de can_manage_team en la BD)
 * admin/superadmin → cualquier equipo; entrenador → solo si es su coach_id.
 */
export function canManageTeam(
  profile: Profile | null,
  team: { id?: string; coach_id: string | null } | null,
  coachTeamIds?: Set<string>
): boolean {
  if (!profile || !team) return false;
  if (rolesOf(profile).includes("admin") || profile.is_superadmin) return true;
  // Entrenador de este equipo: por team_coaches (set) o coach_id legado.
  if (coachTeamIds && team.id && coachTeamIds.has(team.id)) return true;
  return rolesOf(profile).includes("coach") && team.coach_id === profile.id;
}

/** Staff con escritura completa sobre su equipo (admin/coach/superadmin). */
export function isStaff(profile: Profile | null): boolean {
  const r = rolesOf(profile);
  return !!profile && (r.includes("admin") || r.includes("coach") || profile.is_superadmin);
}

/** ¿Tiene rol técnico? */
export function isTecnico(profile: Profile | null): boolean {
  return rolesOf(profile).includes("tecnico");
}

/** ¿Puede capturar? = staff o técnico (stats en vivo + crear entrenamientos). */
export function canCapture(profile: Profile | null): boolean {
  return isStaff(profile) || isTecnico(profile);
}

/** ¿Tiene rol jugador? */
export function isPlayer(profile: Profile | null): boolean {
  return rolesOf(profile).includes("player");
}
