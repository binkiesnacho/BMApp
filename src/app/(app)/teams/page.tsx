import Link from "next/link";
import AppHeader from "@/components/layout/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { canAdminister, getSessionProfile, isPlayer } from "@/lib/auth";
import CreateTeamForm from "./CreateTeamForm";
import type { Team } from "@/lib/types/database";

export const metadata = { title: "Equipos" };

export default async function TeamsPage() {
  const { profile } = await getSessionProfile();
  const isAdmin = canAdminister(profile);
  const player = isPlayer(profile);

  const supabase = await createClient();
  // admin/superadmin → todos los del club; coach → los suyos; jugador → el suyo.
  let query = supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: true });
  let teams: Team[] = [];
  if (player) {
    if (profile?.team_id) {
      const { data } = await query.eq("id", profile.team_id).returns<Team[]>();
      teams = data ?? [];
    }
  } else {
    if (!isAdmin && profile) query = query.eq("coach_id", profile.id);
    const { data } = await query.returns<Team[]>();
    teams = data ?? [];
  }

  return (
    <>
      <AppHeader
        title={player ? "Mi equipo" : "Equipos"}
        subtitle={isAdmin ? "Gestión del club" : "Tus equipos"}
      />

      {isAdmin && (
        <div className="mt-4">
          <CreateTeamForm />
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {teams?.map((team) => (
          <li key={team.id}>
            <Link
              href={`/teams/${team.id}`}
              className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 transition-colors hover:border-brand/60"
            >
              <span className="font-medium text-slate-100">{team.name}</span>
              <span className="text-slate-500">›</span>
            </Link>
          </li>
        ))}
      </ul>

      {(!teams || teams.length === 0) && (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-400">
          {isAdmin
            ? "Aún no hay equipos. Crea el primero arriba."
            : "No tienes equipos asignados todavía."}
        </div>
      )}
    </>
  );
}
