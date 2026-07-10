import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { SectionTitle } from "@/components/ui/List";
import RoleTags from "@/components/ui/RoleTags";
import MembershipToggle from "@/components/admin/MembershipToggle";
import { createClient } from "@/lib/supabase/server";
import { canAdminister, getSessionProfile, isStaff, rolesOf } from "@/lib/auth";
import {
  addMemberRoleAction,
  removeMemberRoleAction,
} from "../../admin/actions";
import type { Player, Profile, Team, UserRole } from "@/lib/types/database";

export const metadata = { title: "Miembro" };

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  coach: "Entrenador",
  tecnico: "Técnico",
  player: "Jugador",
};

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile: me } = await getSessionProfile();
  if (!me?.club_id) redirect("/onboarding");
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle<Profile>();
  // RLS decide la visibilidad; si no llega, no existe para este usuario.
  if (!member || member.club_id !== me.club_id) notFound();

  const isAdmin = canAdminister(me);
  const memberRoles = rolesOf(member);
  const back = isStaff(me) ? "/admin/members" : "/";

  const [{ data: teams }, { data: coachRows }, { data: fichas }] =
    await Promise.all([
      supabase
        .from("teams")
        .select("id, name")
        .eq("club_id", me.club_id)
        .order("name", { ascending: true })
        .returns<Pick<Team, "id" | "name">[]>(),
      supabase
        .from("team_coaches")
        .select("team_id")
        .eq("profile_id", id)
        .returns<{ team_id: string }[]>(),
      supabase
        .from("players")
        .select("id, team_id")
        .eq("profile_id", id)
        .returns<Pick<Player, "id" | "team_id">[]>(),
    ]);

  const coachSet = new Set((coachRows ?? []).map((r) => r.team_id));
  const playerTeamSet = new Set((fichas ?? []).map((r) => r.team_id));
  const fichaByTeam = new Map((fichas ?? []).map((r) => [r.team_id, r.id]));
  const teamName = (tid: string) =>
    (teams ?? []).find((t) => t.id === tid)?.name ?? "Equipo";

  // Equipos donde participa (para la vista de lectura).
  const memberTeamIds = new Set<string>([...coachSet, ...playerTeamSet]);

  // Roles asignables desde aquí (admin: todos).
  const assignable: UserRole[] = ["admin", "coach", "tecnico", "player"];

  return (
    <Screen
      title={member.name || "Miembro"}
      subtitle={member.is_superadmin ? "Administrador global" : undefined}
      back={back}
    >
      <div className="mb-4">
        <RoleTags roles={memberRoles} superadmin={member.is_superadmin} />
      </div>

      {/* Equipos donde participa (lectura) */}
      {memberTeamIds.size > 0 && (
        <div className="mb-5">
          <SectionTitle>Equipos</SectionTitle>
          <ul className="space-y-2">
            {[...memberTeamIds].map((tid) => {
              const fichaId = fichaByTeam.get(tid);
              const roleTxt = [
                coachSet.has(tid) ? "Entrenador" : null,
                playerTeamSet.has(tid) ? "Jugador" : null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li
                  key={tid}
                  className="flex items-center justify-between gap-2 rounded-2xl bg-surface px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] text-label">{teamName(tid)}</p>
                    <p className="text-[12px] text-label-2">{roleTxt}</p>
                  </div>
                  {fichaId && (
                    <Link
                      href={`/players/${fichaId}`}
                      className="shrink-0 rounded-xl border border-separator px-3 py-2 text-[13px] font-medium text-sky-200 active:scale-95"
                    >
                      Ver ficha
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Gestión (solo admin) */}
      {isAdmin && (
        <>
          <SectionTitle>Roles</SectionTitle>
          <div className="mb-5 flex flex-wrap gap-2">
            {assignable.map((r) => {
              const active = memberRoles.includes(r);
              const disabledSelf = member.id === me.id && r === "admin" && active;
              return (
                <form
                  key={r}
                  action={active ? removeMemberRoleAction : addMemberRoleAction}
                >
                  <input type="hidden" name="memberId" value={member.id} />
                  <input type="hidden" name="role" value={r} />
                  <button
                    disabled={disabledSelf}
                    className={`min-h-[40px] rounded-full px-4 text-[13px] font-medium transition active:scale-95 disabled:opacity-40 ${
                      active ? "bg-brand text-white" : "bg-surface-2 text-label-2"
                    }`}
                  >
                    {active ? "✓ " : "+ "}
                    {ROLE_LABEL[r]}
                  </button>
                </form>
              );
            })}
          </div>

          <SectionTitle>Equipos y asignación</SectionTitle>
          <ul className="space-y-2">
            {teams?.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-2xl bg-surface px-4 py-3"
              >
                <span className="min-w-0 truncate text-[15px] text-label">
                  {t.name}
                </span>
                <MembershipToggle
                  teamId={t.id}
                  profileId={member.id}
                  isCoach={coachSet.has(t.id)}
                  isPlayer={playerTeamSet.has(t.id)}
                  canAssignCoach
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </Screen>
  );
}
