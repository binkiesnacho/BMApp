import { redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { createClient } from "@/lib/supabase/server";
import { canAdminister, getSessionProfile, isStaff } from "@/lib/auth";
import InvitesManager from "../InvitesManager";
import type { Invite, Team } from "@/lib/types/database";

export const metadata = { title: "Invitaciones" };

export default async function InvitesPage() {
  const { profile } = await getSessionProfile();
  if (!profile?.club_id) redirect("/onboarding");
  if (!isStaff(profile)) redirect("/");
  const isAdmin = canAdminister(profile);

  const supabase = await createClient();
  const [{ data: teams }, { data: invites }] = await Promise.all([
    supabase
      .from("teams")
      .select("*")
      .eq("club_id", profile.club_id)
      .order("name", { ascending: true })
      .returns<Team[]>(),
    supabase
      .from("invites")
      .select("*")
      .order("created_at", { ascending: true })
      .returns<Invite[]>(),
  ]);

  const invitableTeams = isAdmin
    ? teams ?? []
    : (teams ?? []).filter((t) => t.coach_id === profile.id);

  return (
    <Screen title="Invitaciones" back="/admin">
      <section className="rounded-2xl bg-surface p-4">
        <InvitesManager
          invites={invites ?? []}
          teams={invitableTeams}
          canInviteCoach={isAdmin}
        />
      </section>
      <p className="mt-2 px-1 text-[12px] text-label-3">
        {isAdmin
          ? "Crea un código por rol (y equipo). Compártelo con cada persona; al unirse queda con ese rol."
          : "Como entrenador puedes invitar a jugadores y técnicos a tus equipos."}
      </p>
    </Screen>
  );
}
