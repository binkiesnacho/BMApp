import { redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { createClient } from "@/lib/supabase/server";
import { canAdminister, getSessionProfile, isStaff } from "@/lib/auth";
import {
  assignMemberTeamAction,
  removeMemberAction,
  setMemberRoleAction,
} from "../actions";
import type { Profile, Team } from "@/lib/types/database";

export const metadata = { title: "Miembros" };

const roleLabel: Record<string, string> = {
  admin: "Administrador",
  coach: "Entrenador",
  tecnico: "Técnico",
  player: "Jugador",
};

export default async function MembersPage() {
  const { profile } = await getSessionProfile();
  if (!profile?.club_id) redirect("/onboarding");
  if (!isStaff(profile)) redirect("/");
  const isAdmin = canAdminister(profile);

  const supabase = await createClient();
  const [{ data: members }, { data: teams }] = await Promise.all([
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
      .returns<Team[]>(),
  ]);

  const teamName = (id: string | null) => teams?.find((t) => t.id === id)?.name;
  const selectCls =
    "rounded-lg border border-separator bg-surface px-2 py-1.5 text-xs text-label outline-none focus:border-brand";
  const btnCls =
    "rounded-lg border border-separator px-2 py-1.5 text-xs text-label hover:border-brand";

  return (
    <Screen title="Miembros" subtitle={`${members?.length ?? 0} personas`} back="/admin">
      <ul className="space-y-2">
        {members?.map((m) => {
          const isSelf = m.id === profile.id;
          const hasTeam = m.role === "player" || m.role === "tecnico";
          const canManage =
            !isSelf && (isAdmin || m.role === "player" || m.role === "tecnico");
          return (
            <li key={m.id} className="space-y-2 rounded-2xl bg-surface px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-label">
                    {m.name || "(sin nombre)"} {isSelf && "· tú"}
                  </p>
                  <p className="text-[12px] text-label-3">
                    {roleLabel[m.role] ?? m.role}
                    {hasTeam && ` · ${teamName(m.team_id) ?? "sin equipo"}`}
                  </p>
                </div>
                {!isSelf && isAdmin && (
                  <form action={removeMemberAction}>
                    <input type="hidden" name="memberId" value={m.id} />
                    <button
                      className="rounded-lg px-2 py-1 text-xs text-label-3 hover:text-negative"
                      aria-label={`Expulsar ${m.name}`}
                    >
                      ✕
                    </button>
                  </form>
                )}
              </div>

              {canManage && (
                <div className="flex flex-wrap gap-2">
                  <form action={setMemberRoleAction} className="flex gap-1">
                    <input type="hidden" name="memberId" value={m.id} />
                    <select name="role" defaultValue={m.role} className={selectCls}>
                      {isAdmin && <option value="admin">Administrador</option>}
                      {isAdmin && <option value="coach">Entrenador</option>}
                      <option value="tecnico">Técnico</option>
                      <option value="player">Jugador</option>
                    </select>
                    <button className={btnCls}>Rol</button>
                  </form>

                  {hasTeam && (
                    <form action={assignMemberTeamAction} className="flex gap-1">
                      <input type="hidden" name="memberId" value={m.id} />
                      <select
                        name="teamId"
                        defaultValue={m.team_id ?? ""}
                        className={selectCls}
                      >
                        <option value="">Sin equipo</option>
                        {teams?.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <button className={btnCls}>Equipo</button>
                    </form>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Screen>
  );
}
