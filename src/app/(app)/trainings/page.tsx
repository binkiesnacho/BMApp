import Link from "next/link";
import Screen from "@/components/ui/Screen";
import Card, { EmptyState } from "@/components/ui/Card";
import { ListGroup, ListRow, SectionTitle } from "@/components/ui/List";
import { createClient } from "@/lib/supabase/server";
import { canCapture, getSessionProfile } from "@/lib/auth";
import type {
  Player,
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

export default async function TrainingsPage() {
  const { profile } = await getSessionProfile();
  const capture = canCapture(profile);
  const supabase = await createClient();

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

  const faltas = new Map<string, number>();
  for (const a of attendance ?? []) {
    if (!a.attended) faltas.set(a.player_id, (faltas.get(a.player_id) ?? 0) + 1);
  }
  const faltasRows = (players ?? [])
    .map((p) => ({ p, n: faltas.get(p.id) ?? 0 }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n);
  const myPlayerIds = new Set(
    (players ?? []).filter((p) => p.profile_id === profile?.id).map((p) => p.id)
  );

  const total = (t: Training) =>
    t.phases.reduce((s, ph) => s + (Number(ph.minutes) || 0), 0);

  return (
    <Screen title="Entrenamientos">
      {capture && (
        <Link href="/trainings/new" className="btn btn-primary mb-4 w-full py-3.5">
          <span className="text-lg leading-none">＋</span> Nuevo entrenamiento
        </Link>
      )}

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

      {!trainings || trainings.length === 0 ? (
        <EmptyState icon="🏋️">
          {capture
            ? "Sin entrenamientos. Crea el primero arriba."
            : "Tu equipo aún no tiene entrenamientos."}
        </EmptyState>
      ) : (
        <ListGroup>
          {trainings.map((t) => (
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
