import { notFound, redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { SectionTitle } from "@/components/ui/List";
import FichaBody from "@/components/ficha/FichaBody";
import RoleManager from "@/components/admin/RoleManager";
import TeamMembershipManager from "@/components/admin/TeamMembershipManager";
import { createClient } from "@/lib/supabase/server";
import { canAdminister, getSessionProfile, isStaff, rolesOf } from "@/lib/auth";
import type { Player, Profile, Team } from "@/lib/types/database";

export const metadata = { title: "Ficha" };

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
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

  const isSelf = member.id === me.id;
  const isAdmin = canAdminister(me);
  const back = isStaff(me) ? "/admin/members" : "/";

  return (
    <Screen title={member.name || "Miembro"} back={back}>
      <FichaBody
        profile={member}
        activeTab={tab}
        basePath={`/miembros/${id}`}
        self={isSelf}
      />

      {isAdmin && (
        <MemberManagement
          member={member}
          lockAdmin={isSelf}
          clubId={me.club_id}
          supabase={supabase}
        />
      )}
    </Screen>
  );
}

/* Sección de gestión (solo admin): roles y equipos de la persona. */
async function MemberManagement({
  member,
  lockAdmin,
  clubId,
  supabase,
}: {
  member: Profile;
  lockAdmin: boolean;
  clubId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const [{ data: teams }, { data: coachRows }, { data: fichas }] =
    await Promise.all([
      supabase
        .from("teams")
        .select("id, name")
        .eq("club_id", clubId)
        .order("name", { ascending: true })
        .returns<Pick<Team, "id" | "name">[]>(),
      supabase
        .from("team_coaches")
        .select("team_id")
        .eq("profile_id", member.id)
        .returns<{ team_id: string }[]>(),
      supabase
        .from("players")
        .select("team_id")
        .eq("profile_id", member.id)
        .returns<Pick<Player, "team_id">[]>(),
    ]);

  const coachTeamIds = [...new Set((coachRows ?? []).map((r) => r.team_id))];
  const playerTeamIds = [...new Set((fichas ?? []).map((r) => r.team_id))];

  return (
    <div className="mt-7 border-t border-separator/60 pt-5">
      <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-brand">
        Administración
      </p>

      <div className="mb-6">
        <SectionTitle>Roles</SectionTitle>
        <RoleManager
          memberId={member.id}
          current={rolesOf(member)}
          lockAdmin={lockAdmin}
        />
      </div>

      <div>
        <SectionTitle>Equipos</SectionTitle>
        <TeamMembershipManager
          memberId={member.id}
          teams={teams ?? []}
          coachTeamIds={coachTeamIds}
          playerTeamIds={playerTeamIds}
          canAssignCoach
        />
      </div>
    </div>
  );
}
