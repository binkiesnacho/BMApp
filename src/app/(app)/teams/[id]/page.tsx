import Link from "next/link";
import { notFound } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { deletePlayerAction } from "./actions";
import AddPlayerForm from "./AddPlayerForm";
import type { Player, Team } from "@/lib/types/database";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS: solo devuelve el equipo si el usuario puede gestionarlo/verlo.
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .maybeSingle<Team>();

  if (!team) notFound();

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", id)
    .order("number", { ascending: true, nullsFirst: false })
    .returns<Player[]>();

  return (
    <>
      <AppHeader
        title={team.name}
        subtitle={`${players?.length ?? 0} jugadores`}
        action={
          <Link
            href="/teams"
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300"
          >
            ‹ Equipos
          </Link>
        }
      />

      <div className="mt-4">
        <AddPlayerForm teamId={team.id} />
      </div>

      <ul className="mt-4 space-y-2">
        {players?.map((player) => (
          <li
            key={player.id}
            className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2.5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-brand">
              {player.number ?? "–"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-100">
                {player.name}
              </p>
              {player.position && (
                <p className="truncate text-xs text-slate-400">
                  {player.position}
                </p>
              )}
            </div>
            <form action={deletePlayerAction}>
              <input type="hidden" name="playerId" value={player.id} />
              <input type="hidden" name="teamId" value={team.id} />
              <button
                type="submit"
                className="rounded-lg px-2 py-1 text-xs text-slate-500 transition-colors hover:text-red-400"
                aria-label={`Eliminar ${player.name}`}
              >
                ✕
              </button>
            </form>
          </li>
        ))}
      </ul>

      {(!players || players.length === 0) && (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-400">
          Aún no hay jugadores en la plantilla.
        </div>
      )}
    </>
  );
}
