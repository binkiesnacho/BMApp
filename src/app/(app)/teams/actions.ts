"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canAdminister, getSessionProfile } from "@/lib/auth";

export type TeamFormState = { error?: string };

/** Crea un equipo dentro del club del admin actual. */
export async function createTeamAction(
  _prev: TeamFormState,
  formData: FormData
): Promise<TeamFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Escribe el nombre del equipo." };

  const { profile } = await getSessionProfile();
  if (!profile?.club_id) return { error: "No perteneces a ningún club." };
  if (!canAdminister(profile))
    return { error: "Solo el administrador puede crear equipos." };

  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({
    name,
    club_id: profile.club_id,
  });

  if (error) return { error: error.message };

  revalidatePath("/teams");
  return {};
}

/** Elimina un equipo (RLS permite solo al admin del club). */
export async function deleteTeamAction(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  if (!teamId) return;

  const supabase = await createClient();
  await supabase.from("teams").delete().eq("id", teamId);
  revalidatePath("/teams");
}
