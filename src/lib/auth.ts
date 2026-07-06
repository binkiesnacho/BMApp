import { createClient } from "@/lib/supabase/server";
import type { Club, Profile, Team } from "@/lib/types/database";

/**
 * Equipos "de la persona": donde es entrenador (coach_id), donde tiene ficha de
 * roster vinculada, o el que tiene asignado (profiles.team_id). Ordenados.
 */
export async function getMyTeams(): Promise<Team[]> {
  const { profile } = await getSessionProfile();
  if (!profile?.club_id) return [];
  const supabase = await createClient();

  const [{ data: coached }, { data: rosterRows }] = await Promise.all([
    supabase.from("teams").select("*").eq("coach_id", profile.id).returns<Team[]>(),
    supabase
      .from("players")
      .select("team_id")
      .eq("profile_id", profile.id)
      .returns<{ team_id: string }[]>(),
  ]);

  const ids = new Set<string>();
  (coached ?? []).forEach((t) => ids.add(t.id));
  (rosterRows ?? []).forEach((r) => ids.add(r.team_id));
  if (profile.team_id) ids.add(profile.team_id);

  if (ids.size === 0) return [];
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .in("id", [...ids])
    .order("name", { ascending: true })
    .returns<Team[]>();
  return teams ?? [];
}

/** Club del usuario actual (o null). */
export async function getMyClub(): Promise<Club | null> {
  const { profile } = await getSessionProfile();
  if (!profile?.club_id) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("clubs")
    .select("*")
    .eq("id", profile.club_id)
    .maybeSingle<Club>();
  return data ?? null;
}

/**
 * Devuelve el usuario autenticado y su perfil (o null si no hay sesión).
 * Uso en Server Components / Server Actions.
 */
export async function getSessionProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  return { user, profile: profile ?? null };
}

/** ¿El perfil tiene permisos de administración (admin de club o admin global)? */
export function canAdminister(profile: Profile | null): boolean {
  return !!profile && (profile.role === "admin" || profile.is_superadmin);
}

/** Staff con escritura completa sobre su equipo (admin/coach/superadmin). */
export function isStaff(profile: Profile | null): boolean {
  return (
    !!profile &&
    (profile.role === "admin" ||
      profile.role === "coach" ||
      profile.is_superadmin)
  );
}

/** ¿Es técnico? (ve como el entrenador; solo escribe stats en vivo y entrenamientos). */
export function isTecnico(profile: Profile | null): boolean {
  return profile?.role === "tecnico";
}

/** ¿Puede capturar? = staff o técnico (stats en vivo + crear entrenamientos). */
export function canCapture(profile: Profile | null): boolean {
  return isStaff(profile) || isTecnico(profile);
}

/** ¿Es jugador (acceso de solo lectura)? */
export function isPlayer(profile: Profile | null): boolean {
  return profile?.role === "player";
}
