import Screen from "@/components/ui/Screen";
import { ListGroup, ListRow } from "@/components/ui/List";
import { EmptyState } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { canAdminister, getSessionProfile, isStaff } from "@/lib/auth";
import CreateMatchForm from "./CreateMatchForm";
import MatchesTabs from "./MatchesTabs";
import type { Match, Team } from "@/lib/types/database";

export const metadata = { title: "Partidos" };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { profile } = await getSessionProfile();
  const staff = isStaff(profile);
  const supabase = await createClient();

  let manageable: Team[] = [];
  if (staff && profile?.club_id) {
    const q = supabase.from("teams").select("*").eq("club_id", profile.club_id);
    const { data } = canAdminister(profile)
      ? await q.returns<Team[]>()
      : await q.eq("coach_id", profile.id).returns<Team[]>();
    manageable = data ?? [];
  }

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .returns<Match[]>();

  const upcoming = (matches ?? [])
    .filter((m) => m.status !== "finished")
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const results = (matches ?? [])
    .filter((m) => m.status === "finished")
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  const { tab } = await searchParams;
  const active: "proximos" | "resultados" =
    tab === "resultados" || tab === "proximos"
      ? tab
      : upcoming.length > 0
        ? "proximos"
        : "resultados";
  const list = active === "proximos" ? upcoming : results;

  return (
    <Screen title="Partidos" subtitle={staff ? "Calendario y resultados" : undefined}>
      {staff && manageable.length > 0 && (
        <div className="mb-4">
          <CreateMatchForm teams={manageable} />
        </div>
      )}

      <MatchesTabs value={active} />

      <div className="mt-4">
        {list.length === 0 ? (
          <EmptyState icon={active === "proximos" ? "📅" : "🏆"}>
            {active === "proximos"
              ? "No hay partidos próximos."
              : "Todavía no hay resultados."}
          </EmptyState>
        ) : (
          <ListGroup>
            {list.map((m) => {
              const live = m.status === "live";
              const win = m.our_score > m.opp_score;
              const draw = m.our_score === m.opp_score;
              return (
                <ListRow
                  key={m.id}
                  href={`/matches/${m.id}`}
                  title={`vs ${m.opponent}`}
                  subtitle={fmtDate(m.date)}
                  value={
                    active === "proximos" ? (
                      live ? (
                        <span className="rounded-full bg-negative px-2 py-0.5 text-[10px] font-bold text-white">
                          EN VIVO
                        </span>
                      ) : (
                        <span className="text-[13px] text-label-2">
                          {new Date(m.date).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )
                    ) : (
                      <span
                        className={`font-mono text-[15px] font-semibold ${
                          win ? "text-positive" : draw ? "text-label-2" : "text-negative"
                        }`}
                      >
                        {m.our_score}–{m.opp_score}
                      </span>
                    )
                  }
                />
              );
            })}
          </ListGroup>
        )}
      </div>
    </Screen>
  );
}
