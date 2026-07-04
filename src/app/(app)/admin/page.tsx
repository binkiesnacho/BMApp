import { redirect } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { canAdminister, getSessionProfile } from "@/lib/auth";
import RenameClubForm from "./RenameClubForm";
import JoinCodeCard from "./JoinCodeCard";
import {
  assignCoachAction,
  deleteTeamAction,
  removeMemberAction,
  setMemberRoleAction,
} from "./actions";
import type { Club, Profile, Team } from "@/lib/types/database";

export const metadata = { title: "Administración" };

export default async function AdminPage() {
  const { profile } = await getSessionProfile();
  if (!profile?.club_id) redirect("/onboarding");
  if (!canAdminister(profile)) redirect("/"); // admin de club o admin global

  const supabase = await createClient();

  const [{ data: club }, { data: members }, { data: teams }] =
    await Promise.all([
      supabase.from("clubs").select("*").eq("id", profile.club_id).single<Club>(),
      supabase
        .from("profiles")
        .select("*")
        .eq("club_id", profile.club_id)
        .order("created_at", { ascending: true })
        .returns<Profile[]>(),
      supabase
        .from("teams")
        .select("*")
        .eq("club_id", profile.club_id)
        .order("created_at", { ascending: true })
        .returns<Team[]>(),
    ]);

  const memberName = (id: string | null) =>
    members?.find((m) => m.id === id)?.name || "—";

  return (
    <>
      <AppHeader title="Administración" subtitle={club?.name ?? "Tu club"} />

      {/* ---- Club ---- */}
      <section className="mt-4 space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-semibold text-slate-300">Club</h2>
        <RenameClubForm currentName={club?.name ?? ""} />
        {club && <JoinCodeCard code={club.join_code} />}
        <p className="text-xs text-slate-500">
          Comparte este código con tus entrenadores para que se unan al club.
        </p>
      </section>

      {/* ---- Miembros ---- */}
      <section className="mt-4 space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-semibold text-slate-300">
          Miembros ({members?.length ?? 0})
        </h2>
        <ul className="space-y-2">
          {members?.map((m) => {
            const isSelf = m.id === profile.id;
            return (
              <li
                key={m.id}
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-100">
                    {m.name || "(sin nombre)"} {isSelf && "· tú"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {m.role === "admin" ? "Administrador" : "Entrenador"}
                  </p>
                </div>

                {!isSelf && (
                  <>
                    <form action={setMemberRoleAction}>
                      <input type="hidden" name="memberId" value={m.id} />
                      <input
                        type="hidden"
                        name="role"
                        value={m.role === "admin" ? "coach" : "admin"}
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-brand"
                      >
                        {m.role === "admin" ? "Hacer coach" : "Hacer admin"}
                      </button>
                    </form>
                    <form action={removeMemberAction}>
                      <input type="hidden" name="memberId" value={m.id} />
                      <button
                        type="submit"
                        className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:text-red-400"
                        aria-label={`Expulsar ${m.name}`}
                      >
                        ✕
                      </button>
                    </form>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---- Equipos ---- */}
      <section className="mt-4 space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-semibold text-slate-300">
          Equipos ({teams?.length ?? 0})
        </h2>
        <ul className="space-y-3">
          {teams?.map((t) => (
            <li
              key={t.id}
              className="space-y-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-100">{t.name}</p>
                <form action={deleteTeamAction}>
                  <input type="hidden" name="teamId" value={t.id} />
                  <button
                    type="submit"
                    className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:text-red-400"
                  >
                    Eliminar
                  </button>
                </form>
              </div>
              <form action={assignCoachAction} className="flex gap-2">
                <input type="hidden" name="teamId" value={t.id} />
                <select
                  name="coachId"
                  defaultValue={t.coach_id ?? ""}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-brand"
                >
                  <option value="">Sin entrenador</option>
                  {members?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || "(sin nombre)"}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-brand"
                >
                  Asignar
                </button>
              </form>
              <p className="text-xs text-slate-500">
                Entrenador actual: {memberName(t.coach_id)}
              </p>
            </li>
          ))}
        </ul>
        {(!teams || teams.length === 0) && (
          <p className="text-xs text-slate-500">
            Crea equipos desde la pestaña “Equipos”.
          </p>
        )}
      </section>
    </>
  );
}
