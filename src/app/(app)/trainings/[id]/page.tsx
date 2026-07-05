import { notFound } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { createClient } from "@/lib/supabase/server";
import { canCapture, getSessionProfile } from "@/lib/auth";
import { deleteTrainingAction } from "../actions";
import AttendanceEditor from "./AttendanceEditor";
import type { Player, Training, TrainingAttendance } from "@/lib/types/database";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function TrainingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await getSessionProfile();
  const staff = canCapture(profile);

  const supabase = await createClient();

  const { data: training } = await supabase
    .from("trainings")
    .select("*")
    .eq("id", id)
    .maybeSingle<Training>();
  if (!training) notFound();

  const [{ data: players }, { data: attendance }] = await Promise.all([
    supabase
      .from("players")
      .select("*")
      .eq("team_id", training.team_id)
      .order("number", { ascending: true, nullsFirst: false })
      .returns<Player[]>(),
    supabase
      .from("training_attendance")
      .select("*")
      .eq("training_id", id)
      .returns<TrainingAttendance[]>(),
  ]);

  const attendedIds = (attendance ?? [])
    .filter((a) => a.attended)
    .map((a) => a.player_id);
  const attendedSet = new Set(attendedIds);
  const recorded = (attendance ?? []).length > 0;
  const totalMin = training.phases.reduce(
    (s, p) => s + (Number(p.minutes) || 0),
    0
  );
  // Ficha del roster vinculada a la cuenta del usuario actual (si es jugador).
  const myPlayerId = players?.find((p) => p.profile_id === profile?.id)?.id;

  return (
    <Screen
      title={training.title || "Entrenamiento"}
      subtitle={fmtDate(training.date)}
      back="/trainings"
    >
      {training.description && (
        <p className="rounded-2xl bg-surface p-4 text-sm text-label">
          {training.description}
        </p>
      )}

      {/* Fases */}
      <section className="mt-4 rounded-2xl border border-separator/60 bg-surface p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-label">Fases</h2>
          <span className="text-xs text-label-3">{totalMin}&apos; total</span>
        </div>
        {training.phases.length === 0 ? (
          <p className="text-xs text-label-3">Sin fases definidas.</p>
        ) : (
          <ol className="space-y-1.5">
            {training.phases.map((p, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2 text-sm"
              >
                <span className="text-label">
                  {i + 1}. {p.name}
                </span>
                <span className="font-mono text-brand">{p.minutes}&apos;</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Objetivos */}
      {training.objectives.length > 0 && (
        <section className="mt-4 rounded-2xl border border-separator/60 bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold text-label">Objetivos</h2>
          <ul className="space-y-1">
            {training.objectives.map((o, i) => (
              <li key={i} className="flex gap-2 text-sm text-label">
                <span>🎯</span>
                {o}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Asistencia */}
      <section className="mt-4 rounded-2xl border border-separator/60 bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-label">Asistencia</h2>
        {staff ? (
          <AttendanceEditor
            trainingId={training.id}
            players={players ?? []}
            initialAttended={attendedIds}
          />
        ) : !recorded ? (
          <p className="text-xs text-label-3">Asistencia aún sin registrar.</p>
        ) : (
          <ul className="space-y-1.5">
            {players?.map((p) => {
              const present = attendedSet.has(p.id);
              const mine = p.id === myPlayerId;
              return (
                <li
                  key={p.id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                    mine ? "bg-brand/10 ring-1 ring-brand/40" : "bg-canvas"
                  }`}
                >
                  <span className="font-bold text-brand">{p.number ?? "–"}</span>
                  <span className="flex-1 truncate text-label">
                    {p.name}
                    {mine && " · tú"}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      present ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {present ? "Presente" : "Falta"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Eliminar (staff) */}
      {staff && (
        <form action={deleteTrainingAction} className="mt-4">
          <input type="hidden" name="trainingId" value={training.id} />
          <button className="w-full rounded-xl border border-separator/60 py-2.5 text-sm text-label-2 hover:text-red-400">
            Eliminar entrenamiento
          </button>
        </form>
      )}
    </Screen>
  );
}
