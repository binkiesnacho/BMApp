import { createClient } from "@/lib/supabase/server";
import type { Club, Profile } from "@/lib/types/database";

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
