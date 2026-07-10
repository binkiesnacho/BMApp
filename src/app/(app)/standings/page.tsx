import Link from "next/link";
import Screen from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { getMyTeams, getSessionProfile, isStaff } from "@/lib/auth";
import { buildStandings } from "@/lib/standings";
import { EditIcon } from "@/components/ui/icons";
import TeamSelect from "./TeamSelect";
import type { Match, StandingsRow, Team } from "@/lib/types/database";

export const metadata = { title: "Clasificación" };

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const { team: teamParam } = await searchParams;
  const [{ profile }, myTeams] = await Promise.all([
    getSessionProfile(),
    getMyTeams(),
  ]);
  const supabase = await createClient();

  const { data: allTeams } = await supabase
    .from("teams")
    .select("*")
    .order("name", { ascending: true })
    .returns<Team[]>();

  // Mis equipos primero, luego el resto del club.
  const teamOptions: Team[] = [
    ...myTeams,
    ...(allTeams ?? []).filter((t) => !myTeams.some((mt) => mt.id === t.id)),
  ];

  const teamValue = teamParam ?? teamOptions[0]?.id ?? "";
  const team = teamOptions.find((t) => t.id === teamValue);

  if (!team) {
    return (
      <Screen title="Clasificación">
        <EmptyState icon="🏆">No hay equipos para mostrar.</EmptyState>
      </Screen>
    );
  }

  const [{ data: matches }, { data: rivals }] = await Promise.all([
    supabase
      .from("matches")
      .select("*")
      .eq("team_id", team.id)
      .eq("status", "finished")
      .returns<Match[]>(),
    supabase
      .from("standings_rows")
      .select("*")
      .eq("team_id", team.id)
      .order("created_at", { ascending: true })
      .returns<StandingsRow[]>(),
  ]);

  const table = buildStandings(matches ?? [], team.name, rivals ?? []);
  const canEdit = isStaff(profile);

  return (
    <Screen
      title="Clasificación"
      subtitle={team.name}
      back={`/equipo/${team.id}`}
      action={
        canEdit ? (
          <Link
            href={`/standings/edit?team=${team.id}`}
            className="btn btn-secondary w-full py-3.5"
          >
            <EditIcon /> Editar clasificación
          </Link>
        ) : undefined
      }
    >
      {teamOptions.length > 1 && (
        <div className="mb-4">
          <TeamSelect teams={teamOptions} value={teamValue} />
        </div>
      )}

      <div className="no-scrollbar overflow-x-auto rounded-2xl bg-surface">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="text-label-3">
              <th className="px-2 py-2.5 text-center font-medium">#</th>
              <th className="px-2 py-2.5 text-left font-medium">Equipo</th>
              <th className="px-2 py-2.5 text-center font-medium" title="Partidos jugados">PJ</th>
              <th className="px-2 py-2.5 text-center font-medium" title="Ganados">G</th>
              <th className="px-2 py-2.5 text-center font-medium" title="Empatados">E</th>
              <th className="px-2 py-2.5 text-center font-medium" title="Perdidos">P</th>
              <th className="px-2 py-2.5 text-center font-medium" title="Diferencia de goles">±</th>
              <th className="px-2 py-2.5 text-center font-semibold text-label-2" title="Puntos">Pts</th>
            </tr>
          </thead>
          <tbody>
            {table.map((r, i) => (
              <tr
                key={r.id ?? "us"}
                className={`border-t border-separator/50 ${r.isUs ? "bg-brand/10" : ""}`}
              >
                <td className="px-2 py-2.5 text-center text-label-3">{i + 1}</td>
                <td className="px-2 py-2.5 text-label">
                  <span className={r.isUs ? "font-semibold text-brand" : ""}>
                    {r.name}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-center text-label-2">{r.played}</td>
                <td className="px-2 py-2.5 text-center text-label-2">{r.won}</td>
                <td className="px-2 py-2.5 text-center text-label-2">{r.drawn}</td>
                <td className="px-2 py-2.5 text-center text-label-2">{r.lost}</td>
                <td
                  className={`px-2 py-2.5 text-center ${
                    r.gd > 0 ? "text-positive" : r.gd < 0 ? "text-negative" : "text-label-2"
                  }`}
                >
                  {r.gd > 0 ? `+${r.gd}` : r.gd}
                </td>
                <td className="px-2 py-2.5 text-center font-semibold text-label">
                  {r.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 px-1 text-[12px] text-label-3">
        Puntos: victoria 2, empate 1. Tu fila (resaltada) se calcula con los
        partidos finalizados. GF:GC {"->"} goles a favor y en contra.
      </p>

    </Screen>
  );
}
