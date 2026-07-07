import { redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import {
  canAdminister,
  canCapture,
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
  let q = supabase.from("teams").select("*").eq("club_id", profile.club_id);
  if (isTecnico(profile)) q = q.eq("id", profile.team_id ?? "");
  else if (!canAdminister(profile)) q = q.eq("coach_id", profile.id);
  const manageable =
    isTecnico(profile) && !profile.team_id
      ? []
      : (await q.returns<Team[]>()).data ?? [];

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
