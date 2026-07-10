import Link from "next/link";
import { notFound } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile, isStaff } from "@/lib/auth";
import { EditIcon } from "@/components/ui/icons";
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

  return (
    <Screen
      title={team.name}
      subtitle={`${players?.length ?? 0} jugadores`}
      back={`/equipo/${team.id}`}
      action={
        canEdit ? (
          <Link
            href={`/teams/${team.id}/edit`}
            className="btn btn-secondary w-full py-3.5"
          >
            <EditIcon /> Editar plantilla
          </Link>
        ) : undefined
      }
    >
      {/* Vista de solo lectura: la edición de la plantilla vive en /teams/[id]/edit */}
      <ul className="space-y-2">
        {players?.map((player) => (
          <PlayerRow key={player.id} player={player} teamId={team.id} canEdit={false} />
        ))}
      </ul>

      {(!players || players.length === 0) && (
        <EmptyState icon="👥">Aún no hay jugadores en la plantilla.</EmptyState>
      )}
    </Screen>
  );
}
