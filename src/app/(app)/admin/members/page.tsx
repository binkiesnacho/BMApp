import { redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import RoleTags from "@/components/ui/RoleTags";
import { createClient } from "@/lib/supabase/server";
import {
  canAdminister,
  getSessionProfile,
  isStaff,
  rolesOf,
} from "@/lib/auth";
import {
  addMemberRoleAction,
  assignMemberTeamAction,
  removeMemberAction,
  removeMemberRoleAction,
} from "../actions";
import type { Profile, Team, UserRole } from "@/lib/types/database";

export const metadata = { title: "Miembros" };

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
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
  // Roles que este staff puede asignar: admin todos; entrenador solo player/tecnico.
  const assignable: UserRole[] = isAdmin
    ? ["admin", "coach", "tecnico", "player"]
    : ["tecnico", "player"];

  return (
    <Screen title="Miembros" subtitle={`${members?.length ?? 0} personas`} back="/admin">
      <ul className="space-y-2">
        {members?.map((m) => {
          const memberRoles = rolesOf(m);
          const isSelf = m.id === profile.id;
          const hasTeam =
            memberRoles.includes("player") || memberRoles.includes("tecnico");
          // El coach solo gestiona a quien NO sea admin/entrenador.
          const canManage =
            isAdmin ||
            (!memberRoles.includes("admin") && !memberRoles.includes("coach"));

          return (
            <li key={m.id} className="space-y-2 rounded-2xl bg-surface px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-label">
                    {m.name || "(sin nombre)"} {isSelf && "· tú"}
                  </p>
                  <div className="mt-1">
                    <RoleTags roles={memberRoles} superadmin={m.is_superadmin} />
                  </div>
                  {hasTeam && (
                    <p className="mt-1 text-[12px] text-label-3">
                      Equipo: {teamName(m.team_id) ?? "sin asignar"}
                    </p>
                  )}
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
                <>
                  {/* Toggles de rol */}
                  <div className="flex flex-wrap gap-1.5">
                    {assignable.map((r) => {
                      const active = memberRoles.includes(r);
                      const disabledSelf = isSelf && r === "admin" && active;
                      return (
                        <form
                          key={r}
                          action={active ? removeMemberRoleAction : addMemberRoleAction}
                        >
                          <input type="hidden" name="memberId" value={m.id} />
                          <input type="hidden" name="role" value={r} />
                          <button
                            disabled={disabledSelf}
                            className={`rounded-full px-2.5 py-1 text-[12px] font-medium disabled:opacity-40 ${
                              active
                                ? "bg-brand text-white"
                                : "bg-surface-2 text-label-2"
                            }`}
                          >
                            {active ? "✓ " : "+ "}
                            {ROLE_LABEL[r]}
                          </button>
                        </form>
                      );
                    })}
                  </div>

                  {/* Equipo (jugador/técnico) */}
                  {hasTeam && (
                    <form action={assignMemberTeamAction} className="flex gap-1">
                      <input type="hidden" name="memberId" value={m.id} />
                      <select
                        name="teamId"
                        defaultValue={m.team_id ?? ""}
                        className="rounded-lg border border-separator bg-surface px-2 py-1.5 text-xs text-label outline-none focus:border-brand"
                      >
                        <option value="">Sin equipo</option>
                        {teams?.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <button className="rounded-lg border border-separator px-2 py-1.5 text-xs text-label hover:border-brand">
                        Equipo
                      </button>
                    </form>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </Screen>
  );
}
