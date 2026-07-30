import { redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import {
  canAdminister,
  canCapture,
  getMyCoachTeamIds,
  getSessionProfile,
  isTecnico,
} from "@/lib/auth";
import CreateTrainingForm from "../CreateTrainingForm";
import type { Team } from "@/lib/types/database";

export const metadata = { title: "Nuevo entrenamiento" };

export default async function NewTrainingPage() {
  const { profile } = await getSessionProfile();
  if (!canCapture(profile) || !profile?.club_id) redirect("/trainings");

  const supabase = await createClient();
  let manageable: Team[];

  if (canAdminister(profile)) {
    // Admin: cualquier equipo del club.
    manageable =
      (await supabase
        .from("teams")
        .select("*")
        .eq("club_id", profile.club_id)
        .order("name", { ascending: true })
        .returns<Team[]>()).data ?? [];
  } else {
    // Entrenador: sus equipos (team_coaches + coach_id legado, multi-equipo).
    // Técnico: además, su equipo asignado.
    const ids = new Set(await getMyCoachTeamIds());
    if (isTecnico(profile) && profile.team_id) ids.add(profile.team_id);
    manageable = ids.size
      ? (await supabase
          .from("teams")
          .select("*")
          .in("id", [...ids])
          .order("name", { ascending: true })
          .returns<Team[]>()).data ?? []
      : [];
  }

  return (
    <Screen title="Nuevo entrenamiento" back="/trainings">
      {manageable.length === 0 ? (
        <EmptyState icon="🏋️">
          No gestionas ningún equipo al que añadir entrenamientos.
        </EmptyState>
      ) : (
        <CreateTrainingForm teams={manageable} defaultOpen />
      )}
    </Screen>
  );
}
