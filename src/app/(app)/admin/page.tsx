import { redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { SectionTitle } from "@/components/ui/List";
import { createClient } from "@/lib/supabase/server";
import { canAdminister, getSessionProfile, isStaff } from "@/lib/auth";
import RenameClubForm from "./RenameClubForm";
import InvitesManager from "./InvitesManager";
import LogoUploader from "./LogoUploader";
import {
  assignCoachAction,
  assignMemberTeamAction,
  deleteTeamAction,
  removeMemberAction,
  renameTeamAction,
  setMemberRoleAction,
} from "./actions";
import type { Club, Invite, Profile, Team } from "@/lib/types/database";

export const metadata = { title: "Administración" };

const roleLabel: Record<string, string> = {
  admin: "Administrador",
  coach: "Entrenador",
  tecnico: "Técnico",
  player: "Jugador",
};

export default async function AdminPage() {
  const { profile } = await getSessionProfile();
  if (!profile?.club_id) redirect("/onboarding");
  if (!isStaff(profile)) redirect("/"); // staff: admin, entrenador o superadmin
  const isAdmin = canAdminister(profile);

  const supabase = await createClient();

  const [{ data: club }, { data: members }, { data: teams }, { data: invites }] =
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
      // RLS: el admin ve todas las del club; el entrenador, las de sus equipos.
      supabase
        .from("invites")
        .select("*")
        .order("created_at", { ascending: true })
        .returns<Invite[]>(),
    ]);

  const teamName = (id: string | null) =>
    teams?.find((t) => t.id === id)?.name;

  // Equipos para invitar: admin → todos; entrenador → los que gestiona.
  const invitableTeams = isAdmin
    ? teams ?? []
    : (teams ?? []).filter((t) => t.coach_id === profile.id);

  return (
    <Screen
      title={isAdmin ? "Administración" : "Gestión"}
      subtitle={club?.name ?? "Tu club"}
    >
      {/* ---- Club (solo admin) ---- */}
      {isAdmin && club && (
        <>
          <SectionTitle>Club</SectionTitle>
          <section className="space-y-3 rounded-2xl bg-surface p-4">
            <LogoUploader
              clubId={club.id}
              clubName={club.name}
              logoUrl={club.logo_url}
            />
            <RenameClubForm currentName={club.name} />
          </section>
        </>
      )}

      {/* ---- Invitaciones (admin: cualquier rol; entrenador: player/tecnico de su equipo) ---- */}
      <div className={isAdmin ? "mt-5" : ""}>
        <SectionTitle>Invitaciones</SectionTitle>
      </div>
      <section className="rounded-2xl bg-surface p-4">
        <InvitesManager
          invites={invites ?? []}
          teams={invitableTeams}
          canInviteCoach={isAdmin}
        />
      </section>
      {!isAdmin && (
        <p className="mt-1.5 px-1 text-[12px] text-label-3">
          Como entrenador puedes invitar a jugadores y técnicos a tus equipos.
        </p>
      )}

      {/* ---- Miembros ---- */}
      <div className="mt-5">
        <SectionTitle>Miembros ({members?.length ?? 0})</SectionTitle>
      </div>
      <section className="space-y-3 rounded-2xl bg-surface p-4">
        <ul className="space-y-3">
          {members?.map((m) => {
            const isSelf = m.id === profile.id;
            const hasTeam = m.role === "player" || m.role === "tecnico";
            // El coach solo puede gestionar a jugadores/técnicos.
            const canManage =
              !isSelf && (isAdmin || m.role === "player" || m.role === "tecnico");
            return (
              <li
                key={m.id}
                className="space-y-2 rounded-xl border border-separator/60 bg-canvas px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-label">
                      {m.name || "(sin nombre)"} {isSelf && "· tú"}
                    </p>
                    <p className="text-xs text-label-3">
                      {roleLabel[m.role] ?? m.role}
                      {hasTeam && ` · ${teamName(m.team_id) ?? "sin equipo"}`}
                    </p>
                  </div>
                  {!isSelf && isAdmin && (
                    <form action={removeMemberAction}>
                      <input type="hidden" name="memberId" value={m.id} />
                      <button
                        type="submit"
                        className="rounded-lg px-2 py-1 text-xs text-label-3 hover:text-red-400"
                        aria-label={`Expulsar ${m.name}`}
                      >
                        ✕
                      </button>
                    </form>
                  )}
                </div>

                {canManage && (
                  <div className="flex flex-wrap gap-2">
                    {/* Cambiar rol */}
                    <form action={setMemberRoleAction} className="flex gap-1">
                      <input type="hidden" name="memberId" value={m.id} />
                      <select
                        name="role"
                        defaultValue={m.role}
                        className="rounded-lg border border-separator bg-surface px-2 py-1.5 text-xs text-label outline-none focus:border-brand"
                      >
                        {isAdmin && <option value="admin">Administrador</option>}
                        {isAdmin && <option value="coach">Entrenador</option>}
                        <option value="tecnico">Técnico</option>
                        <option value="player">Jugador</option>
                      </select>
                      <button className="rounded-lg border border-separator px-2 py-1.5 text-xs text-label hover:border-brand">
                        Rol
                      </button>
                    </form>

                    {/* Asignar equipo (jugadores y técnicos) */}
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
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---- Equipos (solo admin) ---- */}
      {isAdmin && (
      <div className="mt-5">
        <SectionTitle>Equipos ({teams?.length ?? 0})</SectionTitle>
      <section className="space-y-3 rounded-2xl bg-surface p-4">
        <ul className="space-y-3">
          {teams?.map((t) => (
            <li
              key={t.id}
              className="space-y-2 rounded-xl border border-separator/60 bg-canvas px-3 py-2.5"
            >
              {/* Renombrar + eliminar */}
              <div className="flex gap-2">
                <form action={renameTeamAction} className="flex flex-1 gap-1">
                  <input type="hidden" name="teamId" value={t.id} />
                  <input
                    name="name"
                    defaultValue={t.name}
                    className="flex-1 rounded-lg border border-separator bg-surface px-2 py-1.5 text-sm text-label outline-none focus:border-brand"
                  />
                  <button className="rounded-lg border border-separator px-2 py-1.5 text-xs text-label hover:border-brand">
                    Renombrar
                  </button>
                </form>
                <form action={deleteTeamAction}>
                  <input type="hidden" name="teamId" value={t.id} />
                  <button className="rounded-lg px-2 py-1.5 text-xs text-label-3 hover:text-red-400">
                    Eliminar
                  </button>
                </form>
              </div>

              {/* Asignar entrenador */}
              <form action={assignCoachAction} className="flex gap-2">
                <input type="hidden" name="teamId" value={t.id} />
                <select
                  name="coachId"
                  defaultValue={t.coach_id ?? ""}
                  className="flex-1 rounded-lg border border-separator bg-surface px-2 py-1.5 text-xs text-label outline-none focus:border-brand"
                >
                  <option value="">Sin entrenador</option>
                  {members
                    ?.filter((m) => m.role === "admin" || m.role === "coach")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || "(sin nombre)"}
                      </option>
                    ))}
                </select>
                <button className="rounded-lg border border-separator px-3 py-1.5 text-xs text-label hover:border-brand">
                  Entrenador
                </button>
              </form>
            </li>
          ))}
        </ul>
        {(!teams || teams.length === 0) && (
          <p className="text-xs text-label-3">
            Crea equipos desde la pestaña “Equipos”.
          </p>
        )}
      </section>
      </div>
      )}
    </Screen>
  );
}
