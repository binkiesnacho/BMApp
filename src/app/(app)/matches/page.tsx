import Link from "next/link";
import AppHeader from "@/components/layout/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { canAdminister, getSessionProfile, isStaff } from "@/lib/auth";
import CreateMatchForm from "./CreateMatchForm";
import type { Match, Team } from "@/lib/types/database";

export const metadata = { title: "Partidos" };

const STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Programado", cls: "bg-slate-700 text-slate-200" },
  live: { label: "EN VIVO", cls: "bg-red-600 text-white" },
  finished: { label: "Finalizado", cls: "bg-emerald-700 text-emerald-100" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function MatchesPage() {
  const { profile } = await getSessionProfile();
  const staff = isStaff(profile);

  const supabase = await createClient();

  // Equipos que el usuario puede gestionar (para crear partidos).
  let manageable: Team[] = [];
  if (staff && profile?.club_id) {
    const q = supabase.from("teams").select("*").eq("club_id", profile.club_id);
    const { data } = canAdminister(profile)
      ? await q.returns<Team[]>()
      : await q.eq("coach_id", profile.id).returns<Team[]>();
    manageable = data ?? [];
  }

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("date", { ascending: false })
    .returns<Match[]>();

  return (
    <>
      <AppHeader
        title="Partidos"
        subtitle={staff ? "Calendario y resultados" : "Resultados de tu equipo"}
      />

      {staff && manageable.length > 0 && (
        <div className="mt-4">
          <CreateMatchForm teams={manageable} />
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {matches?.map((m) => {
          const st = STATUS[m.status];
          return (
            <li key={m.id}>
              <Link
                href={`/matches/${m.id}`}
                className="block rounded-2xl border border-slate-800 bg-slate-900 p-3 transition-colors hover:border-brand/60"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{fmtDate(m.date)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}
                  >
                    {st.label}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-medium text-slate-100">
                    vs {m.opponent}
                  </span>
                  {m.status !== "scheduled" && (
                    <span className="font-mono text-lg font-bold text-brand">
                      {m.our_score}–{m.opp_score}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {(!matches || matches.length === 0) && (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-400">
          {staff
            ? "Sin partidos. Crea el primero arriba."
            : "Tu equipo aún no tiene partidos."}
        </div>
      )}
    </>
  );
}
