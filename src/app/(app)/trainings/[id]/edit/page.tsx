import { notFound, redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { createClient } from "@/lib/supabase/server";
import { canCapture, getSessionProfile } from "@/lib/auth";
import CreateTrainingForm from "../../CreateTrainingForm";
import type { Team, Training } from "@/lib/types/database";

export const metadata = { title: "Editar entrenamiento" };

export default async function EditTrainingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await getSessionProfile();
  // Entrenadores, técnicos y admin. La RLS (can_capture_team) refuerza que solo
  // sea sobre su propio equipo; para otros, la consulta del entreno hará notFound.
  if (!canCapture(profile)) redirect(`/trainings/${id}`);

  const supabase = await createClient();
  const { data: training } = await supabase
    .from("trainings")
    .select("*")
    .eq("id", id)
    .maybeSingle<Training>();
  if (!training) notFound();

  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", training.team_id)
    .maybeSingle<Team>();
  if (!team) notFound();

  return (
    <Screen title="Editar entrenamiento" back={`/trainings/${id}`}>
      <CreateTrainingForm
        teams={[team]}
        mode="edit"
        trainingId={id}
        defaultOpen
        initial={{
          teamId: training.team_id,
          dateIso: training.date,
          title: training.title ?? "",
          description: training.description ?? "",
          phases: training.phases,
          objectives: training.objectives,
        }}
      />
    </Screen>
  );
}
