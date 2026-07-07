import { notFound, redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile, isStaff } from "@/lib/auth";
import AddPlayerForm from "../AddPlayerForm";
import PlayerRow from "../PlayerRow";
import type { Player, Team } from "@/lib/types/database";

export const metadata = { title: "Editar plantilla" };

export default async function EditRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await getSessionProfile();
  if (!isStaff(profile)) redirect(`/teams/${id}`);

  const supabase = await createClient();
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .maybeSingle<Team>();
  if (!team) notFound();

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", id)
    .order("number", { ascending: true, nullsFirst: false })
    .returns<Player[]>();

  return (
    <Screen
      title="Editar plantilla"
      subtitle={team.name}
      back={`/teams/${team.id}`}
    >
      <div className="mb-4">
        <AddPlayerForm teamId={team.id} />
      </div>

      <ul className="space-y-2">
        {players?.map((player) => (
          <PlayerRow key={player.id} player={player} teamId={team.id} canEdit />
        ))}
      </ul>

      {(!players || players.length === 0) && (
        <EmptyState icon="👥">Añade el primer jugador arriba.</EmptyState>
      )}
    </Screen>
  );
}
