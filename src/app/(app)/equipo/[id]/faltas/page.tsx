import { notFound, redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/Card";
import { ListGroup, ListRow, SectionTitle } from "@/components/ui/List";
import { createClient } from "@/lib/supabase/server";
import {
  canCapture,
  canManageTeam,
  getMyCoachTeamIds,
  getSessionProfile,
} from "@/lib/auth";
import FaltasFilters from "./FaltasFilters";
import type {
  Player,
  Team,
  Training,
  TrainingAttendance,
} from "@/lib/types/database";

export const metadata = { title: "Faltas" };

function fmtSession(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function FaltasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ player?: string; from?: string; to?: string }>;
}) {
  const { id } = await params;
  const { player: playerParam, from, to } = await searchParams;
  const { profile } = await getSessionProfile();
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, coach_id")
    .eq("id", id)
    .maybeSingle<Pick<Team, "id" | "name" | "coach_id">>();
  if (!team) notFound();
  // Solo el cuerpo técnico (entrenador del equipo o staff) consulta faltas.
  if (
    !canManageTeam(profile, team, await getMyCoachTeamIds()) &&
    !canCapture(profile)
  ) {
    redirect(`/equipo/${id}`);
  }

  const [{ data: players }, { data: trainings }] = await Promise.all([
    supabase
      .from("players")
      .select("id, name, number")
      .eq("team_id", id)
      .order("number", { ascending: true, nullsFirst: false })
      .returns<Pick<Player, "id" | "name" | "number">[]>(),
    supabase
      .from("trainings")
      .select("id, date, title")
      .eq("team_id", id)
      .order("date", { ascending: false })
      .returns<Pick<Training, "id" | "date" | "title">[]>(),
  ]);

  const trainingIds = (trainings ?? []).map((t) => t.id);
  const { data: attendance } = trainingIds.length
    ? await supabase
        .from("training_attendance")
        .select("*")
        .in("training_id", trainingIds)
        .eq("attended", false)
        .returns<TrainingAttendance[]>()
    : { data: [] as TrainingAttendance[] };

  const trainingById = new Map((trainings ?? []).map((t) => [t.id, t]));
  const playerById = new Map((players ?? []).map((p) => [p.id, p]));

  const fromTs = from ? +new Date(`${from}T00:00:00`) : null;
  const toTs = to ? +new Date(`${to}T23:59:59`) : null;

  // Cada falta = ausencia en una sesión; su marca de tiempo es la fecha del
  // entrenamiento. Filtramos por jugador y rango de fechas.
  const rows = (attendance ?? [])
    .map((a) => {
      const t = trainingById.get(a.training_id);
      const p = playerById.get(a.player_id);
      return t && p ? { a, t, p } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .filter((x) => !playerParam || x.p.id === playerParam)
    .filter((x) => {
      const ts = +new Date(x.t.date);
      if (fromTs != null && ts < fromTs) return false;
      if (toTs != null && ts > toTs) return false;
      return true;
    })
    .sort((a, b) => +new Date(b.t.date) - +new Date(a.t.date));

  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.p.id, (counts.get(r.p.id) ?? 0) + 1);
  const summary = [...counts.entries()]
    .map(([pid, n]) => ({ p: playerById.get(pid)!, n }))
    .sort((a, b) => b.n - a.n);

  return (
    <Screen title="Faltas" subtitle={team.name} back={`/equipo/${id}`}>
      <FaltasFilters
        teamId={id}
        players={players ?? []}
        player={playerParam}
        from={from}
        to={to}
      />

      {summary.length > 0 && (
        <div className="mb-5">
          <SectionTitle>Recuento{playerParam ? "" : " por jugador"}</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {summary.map(({ p, n }) => (
              <span
                key={p.id}
                className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-[13px]"
              >
                <span className="text-label">
                  {p.number != null ? `${p.number} · ` : ""}
                  {p.name}
                </span>
                <span className="rounded-full bg-negative px-1.5 text-[11px] font-bold text-white">
                  {n}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState icon="✅">
          {playerParam || from || to
            ? "Sin faltas para ese filtro."
            : "Aún no hay faltas registradas."}
        </EmptyState>
      ) : (
        <ListGroup>
          {rows.map(({ a, t, p }) => (
            <ListRow
              key={a.id}
              title={`${p.number != null ? `${p.number} · ` : ""}${p.name}`}
              subtitle={t.title || "Entrenamiento"}
              value={
                <span className="text-[13px] text-label-2">
                  {fmtSession(t.date)}
                </span>
              }
            />
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}
