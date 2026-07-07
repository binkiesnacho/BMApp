import { redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { canAdminister, getSessionProfile, isStaff } from "@/lib/auth";
import CreateMatchForm from "../CreateMatchForm";
import type { Team } from "@/lib/types/database";

export const metadata = { title: "Nuevo partido" };

export default async function NewMatchPage() {
  const { profile } = await getSessionProfile();
  if (!isStaff(profile) || !profile?.club_id) redirect("/matches");

  const supabase = await createClient();
  const q = supabase.from("teams").select("*").eq("club_id", profile.club_id);
  const { data } = canAdminister(profile)
    ? await q.returns<Team[]>()
    : await q.eq("coach_id", profile.id).returns<Team[]>();
  const manageable = data ?? [];

  return (
    <Screen title="Nuevo partido" back="/matches">
      {manageable.length === 0 ? (
        <EmptyState icon="🤾">
          No gestionas ningún equipo al que añadir partidos.
        </EmptyState>
      ) : (
        <CreateMatchForm teams={manageable} defaultOpen />
      )}
    </Screen>
  );
}
