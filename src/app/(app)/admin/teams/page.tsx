import { redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { canAdminister, getSessionProfile } from "@/lib/auth";
import CreateTeamForm from "../../teams/CreateTeamForm";
import { assignCoachAction, deleteTeamAction, renameTeamAction } from "../actions";
import type { Profile, Team } from "@/lib/types/database";

export const metadata = { title: "Equipos" };

export default async function AdminTeamsPage() {
  const { profile } = await getSessionProfile();
  if (!profile?.club_id) redirect("/onboarding");
  if (!canAdminister(profile)) redirect("/admin");

  const supabase = await createClient();
  const [{ data: teams }, { data: members }] = await Promise.all([
    supabase
      .from("teams")
      .select("*")
      .eq("club_id", profile.club_id)
      .order("created_at", { ascending: true })
      .returns<Team[]>(),
    supabase
      .from("profiles")
      .select("id, name, role")
      .eq("club_id", profile.club_id)
      .returns<Pick<Profile, "id" | "name" | "role">[]>(),
  ]);

  const inputCls =
    "rounded-lg border border-separator bg-surface px-2 py-1.5 text-sm text-label outline-none focus:border-brand";
  const btnCls =
    "rounded-lg border border-separator px-2 py-1.5 text-xs text-label hover:border-brand";

  return (
    <Screen title="Equipos" back="/admin">
      <div className="mb-4">
        <CreateTeamForm />
      </div>

      {(!teams || teams.length === 0) && (
        <EmptyState icon="🛡️">Crea el primer equipo arriba.</EmptyState>
      )}

      <ul className="space-y-2">
        {teams?.map((t) => (
          <li key={t.id} className="space-y-2 rounded-2xl bg-surface px-3 py-2.5">
            <div className="flex gap-2">
              <form action={renameTeamAction} className="flex flex-1 gap-1">
                <input type="hidden" name="teamId" value={t.id} />
                <input name="name" defaultValue={t.name} className={`${inputCls} flex-1`} />
                <button className={btnCls}>Renombrar</button>
              </form>
              <form action={deleteTeamAction}>
                <input type="hidden" name="teamId" value={t.id} />
                <button className="rounded-lg px-2 py-1.5 text-xs text-label-3 hover:text-negative">
                  Eliminar
                </button>
              </form>
            </div>

            <form action={assignCoachAction} className="flex gap-2">
              <input type="hidden" name="teamId" value={t.id} />
              <select name="coachId" defaultValue={t.coach_id ?? ""} className={`${inputCls} flex-1`}>
                <option value="">Sin entrenador</option>
                {members
                  ?.filter((m) => m.role === "admin" || m.role === "coach")
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || "(sin nombre)"}
                    </option>
                  ))}
              </select>
              <button className={btnCls}>Entrenador</button>
            </form>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
