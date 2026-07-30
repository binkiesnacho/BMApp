import { redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import {
  canAdminister,
  getMyCoachTeamIds,
  getSessionProfile,
  isStaff,
} from "@/lib/auth";
import CreateMatchForm from "../CreateMatchForm";
import type { Team } from "@/lib/types/database";

export const metadata = { title: "Nuevo partido" };

export default async function NewMatchPage() {
  const { profile } = await getSessionProfile();
  if (!isStaff(profile) || !profile?.club_id) redirect("/matches");

  const supabase = await createClient();
  let manageable: Team[];

  if (canAdminister(profile)) {
    manageable =
      (await supabase
        .from("teams")
        .select("*")
        .eq("club_id", profile.club_id)
        .order("name", { ascending: true })
        .returns<Team[]>()).data ?? [];
  } else {
    // Entrenador: sus equipos (team_coaches + coach_id legado, multi-equipo).
    const ids = [...(await getMyCoachTeamIds())];
    manageable = ids.length
      ? (await supabase
          .from("teams")
          .select("*")
          .in("id", ids)
          .order("name", { ascending: true })
          .returns<Team[]>()).data ?? []
      : [];
  }

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
