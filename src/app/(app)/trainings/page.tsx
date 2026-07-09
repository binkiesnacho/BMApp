import Link from "next/link";
import Screen from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/Card";
import { ListGroup, ListRow } from "@/components/ui/List";
import { createClient } from "@/lib/supabase/server";
import {
  canAdminister,
  canCapture,
  getMyTeams,
  getSessionProfile,
} from "@/lib/auth";
import TrainingsTeamFilter from "./TrainingsTeamFilter";
import TrainingsDateFilter from "./TrainingsDateFilter";
import type { Team, Training } from "@/lib/types/database";

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
  searchParams: Promise<{ team?: string; from?: string; to?: string }>;
}) {
  const { team: teamParam, from, to } = await searchParams;
  const [{ profile }, myTeams] = await Promise.all([
    getSessionProfile(),
    getMyTeams(),
  ]);
  const capture = canCapture(profile);
  const admin = canAdminister(profile);
  const supabase = await createClient();

  // Los admin pueden ver cualquier equipo del club; el resto, solo los suyos.
  const { data: allTeams } = admin
    ? await supabase
        .from("teams")
        .select("id, name")
        .order("name", { ascending: true })
        .returns<Pick<Team, "id" | "name">[]>()
    : { data: null };
  const filterTeams = admin ? allTeams ?? [] : myTeams;
  const teamName = (tid: string) =>
    filterTeams.find((t) => t.id === tid)?.name ?? "Equipo";

  // Sin vista "todos": siempre un equipo concreto (el primero disponible).
  const teamValue = teamParam ?? filterTeams[0]?.id ?? "";

  if (!teamValue) {
    return (
      <Screen title="Entrenamientos">
        <EmptyState icon="🏋️">
          Aún no perteneces a ningún equipo con entrenamientos.
        </EmptyState>
      </Screen>
    );
  }

  const fromTs = from ? +new Date(`${from}T00:00:00`) : null;
  const toTs = to ? +new Date(`${to}T23:59:59`) : null;

  const { data: trainings } = await supabase
    .from("trainings")
    .select("*")
    .eq("team_id", teamValue)
    .order("date", { ascending: false })
    .returns<Training[]>();

  const list = (trainings ?? []).filter((t) => {
    const ts = +new Date(t.date);
    if (fromTs != null && ts < fromTs) return false;
    if (toTs != null && ts > toTs) return false;
    return true;
  });

  const total = (t: Training) =>
    t.phases.reduce((s, ph) => s + (Number(ph.minutes) || 0), 0);

  return (
    <Screen
      title="Entrenamientos"
      subtitle={teamName(teamValue)}
      action={
        capture ? (
          <Link href="/trainings/new" className="btn btn-primary w-full py-3.5">
            <span className="text-lg leading-none">＋</span> Nuevo entrenamiento
          </Link>
        ) : undefined
      }
    >
      <TrainingsTeamFilter teams={filterTeams} value={teamValue} showAll={false} />
      <TrainingsDateFilter team={teamValue} from={from} to={to} />

      {list.length === 0 ? (
        <EmptyState icon="🏋️">
          {from || to
            ? "No hay entrenamientos en ese rango de fechas."
            : capture
              ? "Sin entrenamientos. Crea el primero abajo."
              : "Este equipo aún no tiene entrenamientos."}
        </EmptyState>
      ) : (
        <ListGroup>
          {list.map((t) => (
            <ListRow
              key={t.id}
              href={`/trainings/${t.id}`}
              title={t.title || "Entrenamiento"}
              subtitle={`${fmtDate(t.date)} · ${total(t)}'`}
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
