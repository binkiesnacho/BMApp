"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canAdminister, getSessionProfile } from "@/lib/auth";

export type AdminFormState = { error?: string; ok?: boolean };

async function requireAdmin() {
  const { profile } = await getSessionProfile();
  if (!profile?.club_id || !canAdminister(profile)) {
    return { profile: null, error: "Acceso solo para administradores." };
  }
  return { profile, error: null as string | null };
}

/** Renombra el club del admin. */
export async function renameClubAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Escribe un nombre." };

  const { profile, error } = await requireAdmin();
  if (!profile) return { error: error! };

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("clubs")
    .update({ name })
    .eq("id", profile.club_id);

  if (dbError) return { error: dbError.message };
  revalidatePath("/admin");
  return { ok: true };
}

/** Cambia el rol de un miembro del club (admin/coach/player). No permite auto-cambio. */
export async function setMemberRoleAction(formData: FormData): Promise<void> {
  const memberId = String(formData.get("memberId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!["admin", "coach", "player"].includes(role)) return;

  const { profile } = await requireAdmin();
  if (!profile) return;
  if (memberId === profile.id) return; // no cambiarse el rol a uno mismo

  const supabase = await createClient();
  // Al dejar de ser jugador, se limpia su equipo asignado.
  const patch =
    role === "player" ? { role } : { role, team_id: null };
  await supabase.from("profiles").update(patch).eq("id", memberId);
  revalidatePath("/admin");
}

/** Asigna (o quita) el equipo de un jugador. */
export async function assignMemberTeamAction(formData: FormData): Promise<void> {
  const memberId = String(formData.get("memberId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  if (!memberId) return;

  const { profile } = await requireAdmin();
  if (!profile) return;

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ team_id: teamId === "" ? null : teamId })
    .eq("id", memberId);
  revalidatePath("/admin");
}

/** Expulsa a un miembro del club (RPC segura). */
export async function removeMemberAction(formData: FormData): Promise<void> {
  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId) return;

  const supabase = await createClient();
  await supabase.rpc("remove_member", { target: memberId });
  revalidatePath("/admin");
}

/** Asigna (o desasigna, si coachId vacío) un entrenador a un equipo. */
export async function assignCoachAction(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const coachId = String(formData.get("coachId") ?? "");
  if (!teamId) return;

  const { profile } = await requireAdmin();
  if (!profile) return;

  const supabase = await createClient();
  await supabase
    .from("teams")
    .update({ coach_id: coachId === "" ? null : coachId })
    .eq("id", teamId);
  revalidatePath("/admin");
}

/** Renombra un equipo del club. */
export async function renameTeamAction(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!teamId || !name) return;

  const { profile } = await requireAdmin();
  if (!profile) return;

  const supabase = await createClient();
  await supabase.from("teams").update({ name }).eq("id", teamId);
  revalidatePath("/admin");
}

/** Elimina un equipo del club. */
export async function deleteTeamAction(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  if (!teamId) return;

  const { profile } = await requireAdmin();
  if (!profile) return;

  const supabase = await createClient();
  await supabase.from("teams").delete().eq("id", teamId);
  revalidatePath("/admin");
}
