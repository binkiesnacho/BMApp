import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

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

/** ¿Es staff (admin/coach/superadmin)? Es decir, puede escribir (según RLS por equipo). */
export function isStaff(profile: Profile | null): boolean {
  return !!profile && profile.role !== "player";
}

/** ¿Es jugador (acceso de solo lectura)? */
export function isPlayer(profile: Profile | null): boolean {
  return profile?.role === "player";
}
