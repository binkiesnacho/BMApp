import { redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile, isStaff } from "@/lib/auth";
import StandingsManager from "../StandingsManager";
import type { StandingsRow, Team } from "@/lib/types/database";

export const metadata = { title: "Editar clasificación" };

export default async function EditStandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const { team: teamId } = await searchParams;
  const { profile } = await getSessionProfile();
  if (!isStaff(profile)) redirect("/standings");
  if (!teamId) redirect("/standings");

  const supabase = await createClient();
  const [{ data: team }, { data: rivals }] = await Promise.all([
    supabase.from("teams").select("*").eq("id", teamId).maybeSingle<Team>(),
    supabase
      .from("standings_rows")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true })
      .returns<StandingsRow[]>(),
  ]);

  if (!team) {
    return (
      <Screen title="Editar clasificación" back="/standings">
        <EmptyState icon="🏆">Equipo no válido.</EmptyState>
      </Screen>
    );
  }

  return (
    <Screen
      title="Editar clasificación"
      subtitle={team.name}
      back={`/standings?team=${team.id}`}
    >
      <StandingsManager teamId={team.id} rows={rivals ?? []} />
    </Screen>
  );
}
