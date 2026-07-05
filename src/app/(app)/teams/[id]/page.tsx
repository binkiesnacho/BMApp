import { notFound } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile, isStaff } from "@/lib/auth";
import AddPlayerForm from "./AddPlayerForm";
import PlayerRow from "./PlayerRow";
import type { Player, Team } from "@/lib/types/database";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await getSessionProfile();
  const canEdit = isStaff(profile);

  const supabase = await createClient();

  // RLS: solo devuelve el equipo si el usuario puede verlo/gestionarlo.
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

  // Cuentas de jugador del CLUB (para vincular con la ficha del roster; un jugador
  // puede estar en varios equipos, así que no se limita a este equipo).
  const accounts =
    canEdit && profile?.club_id
      ? (
          await supabase
            .from("profiles")
            .select("id, name")
            .eq("club_id", profile.club_id)
            .eq("role", "player")
            .returns<{ id: string; name: string }[]>()
        ).data ?? []
      : [];

  return (
    <Screen
      title={team.name}
      subtitle={`${players?.length ?? 0} jugadores`}
      back="/teams"
    >
      {canEdit && (
        <div className="mb-4">
          <AddPlayerForm teamId={team.id} />
        </div>
      )}

      <ul className="space-y-2">
        {players?.map((player) => (
          <PlayerRow
            key={player.id}
            player={player}
            teamId={team.id}
            canEdit={canEdit}
            accounts={accounts}
          />
        ))}
      </ul>

      {(!players || players.length === 0) && (
        <EmptyState icon="👥">Aún no hay jugadores en la plantilla.</EmptyState>
      )}
    </Screen>
  );
}
