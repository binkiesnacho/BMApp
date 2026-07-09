import Link from "next/link";
import Screen from "@/components/ui/Screen";
import Card, { EmptyState } from "@/components/ui/Card";
import { ListGroup, ListRow, SectionTitle } from "@/components/ui/List";
import { createClient } from "@/lib/supabase/server";
import {
  canAdminister,
  canCapture,
  getMyTeams,
  getSessionProfile,
} from "@/lib/auth";
import TrainingsTeamFilter from "./TrainingsTeamFilter";
import type {
  Player,
  Team,
  Training,
  TrainingAttendance,
} from "@/lib/types/database";

export const metadata = { title: "Entrenamientos" };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export default async function TrainingsPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const { team: teamParam } = await searchParams;
  const [{ profile }, myTeams] = await Promise.all([
    getSessionProfile(),
    getMyTeams(),
  ]);
  const capture = canCapture(profile);
  const admin = canAdminister(profile);
  const supabase = await createClient();

  const [{ data: allTeams }, { data: trainings }, { data: attendance }, { data: players }] =
    await Promise.all([
      supabase
        .from("teams")
        .select("id, name")
        .order("name", { ascending: true })
        .returns<Pick<Team, "id" | "name">[]>(),
      supabase
        .from("trainings")
        .select("*")
        .order("date", { ascending: false })
        .returns<Training[]>(),
      supabase
        .from("training_attendance")
        .select("*")
        .returns<TrainingAttendance[]>(),
      supabase.from("players").select("*").returns<Player[]>(),
    ]);

  // Los admin filtran por cualquier equipo del club (+ "Todos"); el resto, solo
  // por los equipos de los que son parte.
  const filterTeams = admin ? allTeams ?? [] : myTeams;
  const teamName = (tid: string) =>
    (allTeams ?? []).find((t) => t.id === tid)?.name ?? "Equipo";

  // Equipo seleccionado: por defecto el primero mío; "all" = todos (admin).
  const teamValue =
    teamParam ?? (admin ? "all" : myTeams[0]?.id ?? "all");

  const scopedTrainings =
    teamValue === "all"
      ? trainings ?? []
      : (trainings ?? []).filter((t) => t.team_id === teamValue);
  const scopedPlayers =
    teamValue === "all"
      ? players ?? []
      : (players ?? []).filter((p) => p.team_id === teamValue);

  // Faltas acotadas al conjunto visible (equipo seleccionado).
  const scopedTrainingIds = new Set(scopedTrainings.map((t) => t.id));
  const faltas = new Map<string, number>();
  for (const a of attendance ?? []) {
    if (!a.attended && scopedTrainingIds.has(a.training_id)) {
      faltas.set(a.player_id, (faltas.get(a.player_id) ?? 0) + 1);
    }
  }
  const faltasRows = scopedPlayers
    .map((p) => ({ p, n: faltas.get(p.id) ?? 0 }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n);
  const myPlayerIds = new Set(
    (players ?? []).filter((p) => p.profile_id === profile?.id).map((p) => p.id)
  );
  const showTeamLabel = teamValue === "all";

  const total = (t: Training) =>
    t.phases.reduce((s, ph) => s + (Number(ph.minutes) || 0), 0);

  return (
    <Screen
      title="Entrenamientos"
      subtitle={teamValue === "all" ? "Todos los equipos" : teamName(teamValue)}
      action={
        capture ? (
          <Link href="/trainings/new" className="btn btn-primary w-full py-3.5">
            <span className="text-lg leading-none">＋</span> Nuevo entrenamiento
          </Link>
        ) : undefined
      }
    >
      <TrainingsTeamFilter teams={filterTeams} value={teamValue} showAll={admin} />

      {faltasRows.length > 0 && (
        <div className="mb-5">
          <SectionTitle>Faltas acumuladas</SectionTitle>
          <Card>
            <ul className="flex flex-wrap gap-2">
              {faltasRows.map(({ p, n }) => (
                <li
                  key={p.id}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] ${
                    myPlayerIds.has(p.id) ? "bg-brand/15" : "bg-surface-2"
                  }`}
                >
                  <span className="text-label">
                    {p.name}
                    {myPlayerIds.has(p.id) && " · tú"}
                  </span>
                  <span className="rounded-full bg-negative px-1.5 text-[11px] font-bold text-white">
                    {n}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {scopedTrainings.length === 0 ? (
        <EmptyState icon="🏋️">
          {capture
            ? "Sin entrenamientos. Crea el primero abajo."
            : "Tu equipo aún no tiene entrenamientos."}
        </EmptyState>
      ) : (
        <ListGroup>
          {scopedTrainings.map((t) => (
            <ListRow
              key={t.id}
              href={`/trainings/${t.id}`}
              title={t.title || "Entrenamiento"}
              subtitle={
                showTeamLabel
                  ? `${teamName(t.team_id)} · ${fmtDate(t.date)} · ${total(t)}'`
                  : `${fmtDate(t.date)} · ${total(t)}'`
              }
              leading={
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15 text-[15px]">
                  🏋️
                </span>
              }
            />
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}
