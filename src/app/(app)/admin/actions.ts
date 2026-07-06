"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canAdminister, getSessionProfile, isStaff } from "@/lib/auth";

export type AdminFormState = { error?: string; ok?: boolean };

async function requireAdmin() {
  const { profile } = await getSessionProfile();
  if (!profile?.club_id || !canAdminister(profile)) {
    return { profile: null, error: "Acceso solo para administradores." };
  }
  return { profile, error: null as string | null };
}

async function requireStaff() {
  const { profile } = await getSessionProfile();
  if (!profile?.club_id || !isStaff(profile)) {
    return { profile: null };
  }
  return { profile };
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

/** Cambia el rol de un miembro (RPC segura: el coach solo player/tecnico). */
export async function setMemberRoleAction(formData: FormData): Promise<void> {
  const memberId = String(formData.get("memberId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!["admin", "coach", "tecnico", "player"].includes(role)) return;

  const { profile } = await requireStaff();
  if (!profile) return;

  const supabase = await createClient();
  await supabase.rpc("set_member_role", { target: memberId, new_role: role });
  revalidatePath("/admin");
}

/** Asigna (o quita) el equipo de un jugador/técnico (RPC segura). */
export async function assignMemberTeamAction(formData: FormData): Promise<void> {
  const memberId = String(formData.get("memberId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  if (!memberId) return;

  const { profile } = await requireStaff();
  if (!profile) return;

  const supabase = await createClient();
  await supabase.rpc("set_member_team", {
    target: memberId,
    new_team: teamId === "" ? null : teamId,
  });
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

/** Crea una invitación con rol (y equipo). RLS limita al entrenador a player/tecnico de su equipo. */
export async function createInviteAction(formData: FormData): Promise<void> {
  const role = String(formData.get("role") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const label = String(formData.get("label") ?? "").trim() || null;
  if (!["player", "coach", "tecnico"].includes(role)) return;

  const { profile } = await requireStaff();
  if (!profile) return;

  const supabase = await createClient();
  await supabase.from("invites").insert({
    club_id: profile.club_id,
    role,
    team_id: teamId === "" ? null : teamId,
    label,
  });
  revalidatePath("/admin");
}

/** Elimina una invitación. */
export async function deleteInviteAction(formData: FormData): Promise<void> {
  const inviteId = String(formData.get("inviteId") ?? "");
  if (!inviteId) return;
  const supabase = await createClient();
  await supabase.from("invites").delete().eq("id", inviteId);
  revalidatePath("/admin");
}

/** Guarda la URL del logo del club (tras subir el archivo a Storage). */
export async function setClubLogoAction(logoUrl: string): Promise<void> {
  const { profile } = await requireAdmin();
  if (!profile) return;
  const supabase = await createClient();
  await supabase.from("clubs").update({ logo_url: logoUrl }).eq("id", profile.club_id);
  revalidatePath("/admin");
  revalidatePath("/");
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
