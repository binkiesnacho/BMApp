import Link from "next/link";
import AppHeader from "@/components/layout/AppHeader";
import { createClient } from "@/lib/supabase/server";
import {
  canAdminister,
  canCapture,
  getSessionProfile,
  isTecnico,
} from "@/lib/auth";
import CreateTrainingForm from "./CreateTrainingForm";
import type {
  Player,
  Team,
  Training,
  TrainingAttendance,
} from "@/lib/types/database";

export const metadata = { title: "Entrenamientos" };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function TrainingsPage() {
  const { profile } = await getSessionProfile();
  const capture = canCapture(profile);

  const supabase = await createClient();

  // Equipos donde puede crear entrenamientos:
  //   admin → todos; coach → los suyos; técnico → su equipo asignado.
  let manageable: Team[] = [];
  if (capture && profile?.club_id) {
    let q = supabase.from("teams").select("*").eq("club_id", profile.club_id);
    if (isTecnico(profile)) q = q.eq("id", profile.team_id ?? "");
    else if (!canAdminister(profile)) q = q.eq("coach_id", profile.id);
    manageable = isTecnico(profile) && !profile.team_id
      ? []
      : (await q.returns<Team[]>()).data ?? [];
  }

  const [{ data: trainings }, { data: attendance }, { data: players }] =
    await Promise.all([
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

  // Faltas acumuladas por jugador (attended=false).
  const faltas = new Map<string, number>();
  for (const a of attendance ?? []) {
    if (!a.attended)
      faltas.set(a.player_id, (faltas.get(a.player_id) ?? 0) + 1);
  }
  const faltasRows = (players ?? [])
    .map((p) => ({ p, n: faltas.get(p.id) ?? 0 }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n);
  const myPlayerIds = new Set(
    (players ?? [])
      .filter((p) => p.profile_id === profile?.id)
      .map((p) => p.id)
  );

  const total = (t: Training) =>
    t.phases.reduce((s, ph) => s + (Number(ph.minutes) || 0), 0);

  return (
    <>
      <AppHeader
        title="Entrenamientos"
        subtitle={capture ? "Sesiones y asistencia" : "Sesiones de tu equipo"}
      />

      {capture && manageable.length > 0 && (
        <div className="mt-4">
          <CreateTrainingForm teams={manageable} />
        </div>
      )}

      {/* Faltas acumuladas */}
      {faltasRows.length > 0 && (
        <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-300">
            Faltas acumuladas
          </h2>
          <ul className="flex flex-wrap gap-2">
            {faltasRows.map(({ p, n }) => (
              <li
                key={p.id}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                  myPlayerIds.has(p.id)
                    ? "border-brand/60 bg-brand/10"
                    : "border-slate-700 bg-slate-950"
                }`}
              >
                <span className="text-slate-200">
                  {p.name}
                  {myPlayerIds.has(p.id) && " · tú"}
                </span>
                <span className="rounded-full bg-red-600 px-1.5 font-bold text-white">
                  {n}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Histórico */}
      <ul className="mt-4 space-y-2">
        {trainings?.map((t) => (
          <li key={t.id}>
            <Link
              href={`/trainings/${t.id}`}
              className="block rounded-2xl border border-slate-800 bg-slate-900 p-3 transition-colors hover:border-brand/60"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{fmtDate(t.date)}</span>
                <span className="text-xs text-slate-500">{total(t)}&apos;</span>
              </div>
              <p className="mt-1 font-medium text-slate-100">
                {t.title || "Entrenamiento"}
              </p>
              {t.objectives.length > 0 && (
                <p className="truncate text-xs text-slate-400">
                  🎯 {t.objectives.join(" · ")}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {(!trainings || trainings.length === 0) && (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-400">
          {capture
            ? "Sin entrenamientos. Crea el primero arriba."
            : "Tu equipo aún no tiene entrenamientos."}
        </div>
      )}
    </>
  );
}
