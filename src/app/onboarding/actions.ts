"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error?: string };

/** Crea un club nuevo y convierte al usuario actual en admin (vía RPC segura). */
export async function createClubAction(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const clubName = String(formData.get("clubName") ?? "").trim();
  if (!clubName) return { error: "Escribe el nombre del club." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_club_and_become_admin", {
    club_name: clubName,
  });

  if (error) return { error: error.message };

  redirect("/");
}

/** Se une a un club existente usando su código de invitación (coach o jugador). */
export async function joinClubAction(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const code = String(formData.get("code") ?? "").trim();
  const joinAs = String(formData.get("joinAs") ?? "coach");
  if (!code) return { error: "Escribe el código del club." };
  if (!["coach", "player", "tecnico"].includes(joinAs)) {
    return { error: "Rol no válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("join_club_with_code", {
    code,
    join_as: joinAs,
  });

  if (error) return { error: error.message };

  redirect("/");
}
