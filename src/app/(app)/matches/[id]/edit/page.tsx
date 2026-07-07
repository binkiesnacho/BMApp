import { notFound, redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { createClient } from "@/lib/supabase/server";
import { canManageTeam, getSessionProfile } from "@/lib/auth";
import EditMatchForm from "../EditMatchForm";
import { deleteMatchAction } from "../../actions";
import type { Match, Team } from "@/lib/types/database";

export const metadata = { title: "Editar partido" };

export default async function EditMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await getSessionProfile();

  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .maybeSingle<Match>();
  if (!match) notFound();

  // Solo admin o el entrenador de ESTE equipo pueden editar.
  const { data: team } = await supabase
    .from("teams")
    .select("id, coach_id")
    .eq("id", match.team_id)
    .maybeSingle<Pick<Team, "id" | "coach_id">>();
  if (!canManageTeam(profile, team ?? null)) redirect(`/matches/${id}`);

  return (
    <Screen title="Editar partido" subtitle={`vs ${match.opponent}`} back={`/matches/${match.id}`}>
      <EditMatchForm match={match} defaultOpen />

      <div className="mt-6">
        <p className="ios-section-caption mb-1.5 px-1">Zona de peligro</p>
        <form action={deleteMatchAction}>
          <input type="hidden" name="matchId" value={match.id} />
          <button className="tap w-full rounded-xl border border-negative/40 px-4 py-3 text-sm font-medium text-negative">
            Eliminar partido
          </button>
        </form>
      </div>
    </Screen>
  );
}
