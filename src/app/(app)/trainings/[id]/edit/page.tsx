import { notFound, redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { createClient } from "@/lib/supabase/server";
import { canCapture, getSessionProfile } from "@/lib/auth";
import CreateTrainingForm from "../../CreateTrainingForm";
import type { Team, Training } from "@/lib/types/database";

export const metadata = { title: "Editar entrenamiento" };

/** ISO → valor de <input type="datetime-local"> en hora de España (el club juega
 *  en esa zona), para que la fecha salga correcta sin depender del TZ del server. */
function toLocalInput(iso: string): string {
  const p = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

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
          date: toLocalInput(training.date),
          title: training.title ?? "",
          description: training.description ?? "",
          phases: training.phases,
          objectives: training.objectives,
        }}
      />
    </Screen>
  );
}
