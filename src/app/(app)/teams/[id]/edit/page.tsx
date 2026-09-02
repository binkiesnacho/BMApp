import { notFound, redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/List";
import { createClient } from "@/lib/supabase/server";
import { canAdminister, canCapture, getSessionProfile } from "@/lib/auth";
import MembershipToggle from "@/components/admin/MembershipToggle";
import AddPlayerForm from "../AddPlayerForm";
import PlayerRow from "../PlayerRow";
import type { Player, Profile, Team } from "@/lib/types/database";

export const metadata = { title: "Editar plantilla" };

export default async function EditRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await getSessionProfile();
  // Entrenadores, técnicos y admin. La RLS (can_capture_team) refuerza que solo
  // sea sobre su propio equipo; para otros, la consulta del equipo hará notFound.
  if (!canCapture(profile)) redirect(`/teams/${id}`);
  const isAdmin = canAdminister(profile);

  const supabase = await createClient();
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .maybeSingle<Team>();
  if (!team) notFound();

  const [{ data: players }, { data: members }, { data: coachRows }] =
    await Promise.all([
      supabase
        .from("players")
        .select("*")
        .eq("team_id", id)
        .order("number", { ascending: true, nullsFirst: false })
        .returns<Player[]>(),
      supabase
        .from("profiles")
        .select("id, name, roles")
        .eq("club_id", team.club_id)
        .order("name", { ascending: true })
        .returns<Pick<Profile, "id" | "name" | "roles">[]>(),
      supabase
        .from("team_coaches")
        .select("profile_id")
        .eq("team_id", id)
        .returns<{ profile_id: string }[]>(),
    ]);

  const coachSet = new Set((coachRows ?? []).map((r) => r.profile_id));
  const playerProfileSet = new Set(
    (players ?? []).map((p) => p.profile_id).filter(Boolean) as string[]
  );

  const auto = team.auto_position; // equipo automático (p. ej. Porteros)

  return (
    <Screen title="Editar plantilla" subtitle={team.name} back={`/teams/${team.id}`}>
      {auto && (
        <p className="mb-4 rounded-2xl border border-separator/60 bg-surface p-3 text-[13px] text-label-2">
          Plantilla automática: se genera con los jugadores de posición{" "}
          <span className="text-label">{auto}</span> de los demás equipos. Aquí solo
          se asigna el entrenador.
        </p>
      )}

      {/* Asignar personas del club a este equipo (jugador / entrenador) */}
      <div className="mb-5">
        <SectionTitle>{auto ? "Entrenador" : "Miembros del club"}</SectionTitle>
        <ul className="space-y-2">
          {members?.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 rounded-2xl bg-surface px-3 py-2.5"
            >
              <span className="min-w-0 truncate text-[14px] text-label">
                {m.name || "(sin nombre)"}
              </span>
              <MembershipToggle
                teamId={team.id}
                profileId={m.id}
                isCoach={coachSet.has(m.id)}
                isPlayer={playerProfileSet.has(m.id)}
                canAssignCoach={isAdmin}
                canAssignPlayer={!auto}
              />
            </li>
          ))}
          {(!members || members.length === 0) && (
            <li className="text-[13px] text-label-3">No hay miembros en el club.</li>
          )}
        </ul>
      </div>

      {/* Roster manual (solo en equipos no automáticos) */}
      <SectionTitle>Plantilla</SectionTitle>
      {!auto && (
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
            canEdit={!auto}
          />
        ))}
      </ul>

      {(!players || players.length === 0) && (
        <EmptyState icon="👥">
          {auto
            ? `Sin jugadores de posición ${auto} todavía.`
            : "Añade el primer jugador arriba."}
        </EmptyState>
      )}
    </Screen>
  );
}
