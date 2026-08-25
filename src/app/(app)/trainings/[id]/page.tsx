import { notFound } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { createClient } from "@/lib/supabase/server";
import {
  canCapture,
  canManageTeam,
  getMyCoachTeamIds,
  getSessionProfile,
} from "@/lib/auth";
import { loadObservations } from "@/lib/observations";
import ObservationsSection from "../../observations/ObservationsSection";
import CourtView from "@/components/court/CourtView";
import { deleteTrainingAction } from "../actions";
import AttendanceEditor from "./AttendanceEditor";
import TrainingFiles from "./TrainingFiles";
import type {
  Player,
  Profile,
  Team,
  Training,
  TrainingAttendance,
  TrainingFile,
} from "@/lib/types/database";

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

  const [{ data: team }, { data: players }, { data: attendance }, { data: files }] =
    await Promise.all([
      supabase
        .from("teams")
        .select("id, coach_id")
        .eq("id", training.team_id)
        .maybeSingle<Pick<Team, "id" | "coach_id">>(),
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
      supabase
        .from("training_files")
        .select("*")
        .eq("training_id", id)
        .order("created_at", { ascending: true })
        .returns<TrainingFile[]>(),
    ]);

  // Nombres del autor del entreno y de quien pasó lista.
  const nameIds = [training.author_id, training.attendance_by].filter(
    Boolean
  ) as string[];
  const nameById = new Map<string, string>();
  if (nameIds.length) {
    const { data: people } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", nameIds)
      .returns<Pick<Profile, "id" | "name">[]>();
    (people ?? []).forEach((p) => nameById.set(p.id, p.name));
  }
  const authorName = training.author_id
    ? nameById.get(training.author_id) ?? null
    : null;
  const takenByName = training.attendance_by
    ? nameById.get(training.attendance_by) ?? null
    : null;

  const canManage = canManageTeam(profile, team ?? null, await getMyCoachTeamIds());
  const observations = canManage
    ? await loadObservations(supabase, { trainingId: id })
    : [];

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
      {authorName && (
        <p className="-mt-1 mb-3 px-1 text-[13px] text-label-3">
          Creado por <span className="text-label-2">{authorName}</span>
        </p>
      )}

      {/* Objetivos (justo debajo del título, encima de la descripción) */}
      {training.objectives.length > 0 && (
        <section className="mb-4 rounded-2xl border border-separator/60 bg-surface p-4">
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
              <li key={i} className="rounded-xl bg-canvas px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-label">
                    {i + 1}. {p.name}
                  </span>
                  <span className="font-mono text-brand">{p.minutes}&apos;</span>
                </div>

                {/* Formato antiguo: dibujo/pizarras sueltas de la fase */}
                {p.drawing && p.drawing.strokes.length > 0 && (
                  <div className="mt-2">
                    <CourtView drawing={p.drawing} />
                  </div>
                )}
                {p.boards?.map((b, k) => (
                  <div key={k} className="mt-2">
                    <CourtView drawing={b.drawing} />
                    {b.description && (
                      <p className="mt-1 text-xs text-label-2">{b.description}</p>
                    )}
                  </div>
                ))}

                {/* Ejercicios: explicación primero, luego pizarras y progresiones */}
                {p.exercises?.map((ex, ei) => (
                  <div key={ei} className="mt-3 rounded-xl bg-surface/60 p-2.5">
                    {ex.name && (
                      <p className="text-[13px] font-semibold text-label">{ex.name}</p>
                    )}
                    {ex.description && (
                      <p className="mt-0.5 whitespace-pre-line text-[13px] text-label-2">
                        {ex.description}
                      </p>
                    )}
                    {ex.boards.map((b, k) => (
                      <div key={k} className="mt-2">
                        <CourtView drawing={b.drawing} />
                        {b.description && (
                          <p className="mt-1 text-xs text-label-2">{b.description}</p>
                        )}
                      </div>
                    ))}

                    {ex.progressions?.map((pr, pi) => (
                      <div
                        key={pi}
                        className="mt-2 rounded-lg border border-separator/70 p-2"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-200">
                          Progresión {pi + 1}
                        </p>
                        {pr.description && (
                          <p className="mt-0.5 whitespace-pre-line text-[13px] text-label-2">
                            {pr.description}
                          </p>
                        )}
                        {pr.boards.map((b, k) => (
                          <div key={k} className="mt-2">
                            <CourtView drawing={b.drawing} />
                            {b.description && (
                              <p className="mt-1 text-xs text-label-2">{b.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Material adjunto (fotos y PDFs hechos a mano) */}
      <section className="mt-4 rounded-2xl border border-separator/60 bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-label">
          Material {files && files.length > 0 ? `(${files.length})` : ""}
        </h2>
        <TrainingFiles
          trainingId={training.id}
          files={files ?? []}
          canEdit={staff}
        />
      </section>

      {/* Asistencia */}
      <section className="mt-4 rounded-2xl border border-separator/60 bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-label">Asistencia</h2>
        {staff ? (
          <AttendanceEditor
            trainingId={training.id}
            players={players ?? []}
            initialAttended={attendedIds}
            takenAt={training.attendance_taken_at}
            takenBy={takenByName}
          />
        ) : !recorded ? (
          <p className="text-xs text-label-3">Asistencia aún sin registrar.</p>
        ) : (
          <>
            {training.attendance_taken_at && (
              <p className="mb-2 rounded-xl bg-canvas px-3 py-2 text-[12px] text-label-3">
                Lista pasada el{" "}
                <span className="text-label-2">
                  {fmtDate(training.attendance_taken_at)}
                </span>
                {takenByName && (
                  <>
                    {" "}
                    · por <span className="text-label-2">{takenByName}</span>
                  </>
                )}
              </p>
            )}
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
          </>
        )}
      </section>

      {/* Observaciones (privadas del cuerpo técnico; ligables a un jugador) */}
      <ObservationsSection
        observations={observations}
        canManage={canManage}
        ctx={{
          teamId: training.team_id,
          sourceType: "training",
          trainingId: training.id,
          occurredAt: training.date,
        }}
        players={(players ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          number: p.number,
        }))}
        showPlayer
        linkPlayer
      />

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
