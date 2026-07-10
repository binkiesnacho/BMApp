import Link from "next/link";
import { redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import RoleTags from "@/components/ui/RoleTags";
import FilterPills from "@/components/ui/FilterPills";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile, isStaff, rolesOf } from "@/lib/auth";
import type { Profile, Team, UserRole } from "@/lib/types/database";

export const metadata = { title: "Miembros" };

const ROLE_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "admin", label: "Admin" },
  { value: "coach", label: "Entrenador" },
  { value: "tecnico", label: "Técnico" },
  { value: "player", label: "Jugador" },
];

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; team?: string }>;
}) {
  const { role: roleParam, team: teamParam } = await searchParams;
  const { profile } = await getSessionProfile();
  if (!profile?.club_id) redirect("/onboarding");
  if (!isStaff(profile)) redirect("/");

  const roleValue = roleParam ?? "all";
  const teamValue = teamParam ?? "all";

  const supabase = await createClient();
  const [{ data: members }, { data: teams }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("club_id", profile.club_id)
      .order("name", { ascending: true })
      .returns<Profile[]>(),
    supabase
      .from("teams")
      .select("id, name")
      .eq("club_id", profile.club_id)
      .order("name", { ascending: true })
      .returns<Pick<Team, "id" | "name">[]>(),
  ]);

  const teamIds = (teams ?? []).map((t) => t.id);
  const [{ data: coachRows }, { data: playerRows }] = await Promise.all([
    teamIds.length
      ? supabase
          .from("team_coaches")
          .select("team_id, profile_id")
          .in("team_id", teamIds)
          .returns<{ team_id: string; profile_id: string }[]>()
      : Promise.resolve({ data: [] as { team_id: string; profile_id: string }[] }),
    teamIds.length
      ? supabase
          .from("players")
          .select("team_id, profile_id")
          .in("team_id", teamIds)
          .not("profile_id", "is", null)
          .returns<{ team_id: string; profile_id: string }[]>()
      : Promise.resolve({ data: [] as { team_id: string; profile_id: string }[] }),
  ]);

  // Mapa persona -> equipos (como jugador o entrenador).
  const teamsByMember = new Map<string, Set<string>>();
  const add = (pid: string, tid: string) => {
    if (!teamsByMember.has(pid)) teamsByMember.set(pid, new Set());
    teamsByMember.get(pid)!.add(tid);
  };
  (coachRows ?? []).forEach((r) => add(r.profile_id, r.team_id));
  (playerRows ?? []).forEach((r) => add(r.profile_id, r.team_id));
  const teamName = (tid: string) =>
    (teams ?? []).find((t) => t.id === tid)?.name ?? "Equipo";

  const filtered = (members ?? []).filter((m) => {
    if (roleValue !== "all" && !rolesOf(m).includes(roleValue as UserRole))
      return false;
    if (teamValue !== "all" && !teamsByMember.get(m.id)?.has(teamValue))
      return false;
    return true;
  });

  const teamOptions = [
    { value: "all", label: "Todos" },
    ...(teams ?? []).map((t) => ({ value: t.id, label: t.name })),
  ];

  return (
    <Screen
      title="Miembros"
      subtitle={`${filtered.length} de ${members?.length ?? 0}`}
      back="/admin"
    >
      <FilterPills
        options={ROLE_FILTERS}
        value={roleValue}
        ariaLabel="Filtrar por rol"
        hrefFor={(v) => `/admin/members?role=${v}&team=${teamValue}`}
      />
      <FilterPills
        options={teamOptions}
        value={teamValue}
        ariaLabel="Filtrar por equipo"
        hrefFor={(v) => `/admin/members?role=${roleValue}&team=${v}`}
      />

      <ul className="mt-1 space-y-2">
        {filtered.map((m) => {
          const memberTeams = [...(teamsByMember.get(m.id) ?? [])];
          return (
            <li key={m.id}>
              <Link
                href={`/miembros/${m.id}`}
                className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 transition active:scale-[0.99] active:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-label">
                    {m.name || "(sin nombre)"}
                    {m.id === profile.id && " · tú"}
                  </p>
                  <div className="mt-1">
                    <RoleTags roles={rolesOf(m)} superadmin={m.is_superadmin} />
                  </div>
                  {memberTeams.length > 0 && (
                    <p className="mt-1 truncate text-[12px] text-label-3">
                      {memberTeams.map(teamName).join(" · ")}
                    </p>
                  )}
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-label-3">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="rounded-2xl border border-dashed border-separator/70 p-6 text-center text-[13px] text-label-3">
            No hay miembros para ese filtro.
          </li>
        )}
      </ul>
    </Screen>
  );
}
