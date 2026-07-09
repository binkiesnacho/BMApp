import { notFound } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { ListGroup, ListRow } from "@/components/ui/List";
import { createClient } from "@/lib/supabase/server";
import {
  canAdminister,
  canManageTeam,
  getMyCoachTeamIds,
  getSessionProfile,
} from "@/lib/auth";
import { loadObservations } from "@/lib/observations";
import ObservationsSection from "../../observations/ObservationsSection";
import MembershipToggle from "@/components/admin/MembershipToggle";
import { EVENT_LABELS } from "@/lib/events";
import { shootingAccuracy, savePercentage, type EventCounts } from "@/lib/stats";
import type {
  Player,
  StatEvent,
  StatEventType,
  Team,
  TrainingAttendance,
} from "@/lib/types/database";

export const metadata = { title: "Jugador" };

const ORDER: StatEventType[] = [
  "goal",
  "assist",
  "save",
  "goal_conceded",
  "miss",
  "turnover",
  "exclusion_2min",
  "yellow_card",
  "red_card",
];

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex-1 rounded-2xl bg-surface p-3 text-center">
      <p className="font-mono text-2xl font-bold text-brand">{value}</p>
      <p className="text-[12px] text-label-2">{label}</p>
    </div>
  );
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await getSessionProfile();
  const supabase = await createClient();

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .maybeSingle<Player>();
  if (!player) notFound();

  const [{ data: team }, { data: events }, { data: attendance }] =
    await Promise.all([
      supabase
        .from("teams")
        .select("*")
        .eq("id", player.team_id)
        .maybeSingle<Team>(),
      supabase
        .from("stats_events")
        .select("*")
        .eq("player_id", id)
        .returns<StatEvent[]>(),
      supabase
        .from("training_attendance")
        .select("*")
        .eq("player_id", id)
        .returns<TrainingAttendance[]>(),
    ]);

  const canManage = canManageTeam(profile, team ?? null, await getMyCoachTeamIds());
  const observations = canManage
    ? await loadObservations(supabase, { playerId: id })
    : [];

  // Gestión de equipos de esta persona (solo admin y si la ficha está vinculada).
  const isAdmin = canAdminister(profile);
  const linkedProfileId = player.profile_id; // const local: el narrowing persiste en el map
  let teamRows: { id: string; name: string }[] = [];
  let coachSet = new Set<string>();
  let playerSet = new Set<string>();
  if (isAdmin && linkedProfileId && team?.club_id) {
    const [{ data: allTeams }, { data: tc }, { data: pl }] = await Promise.all([
      supabase
        .from("teams")
        .select("id, name")
        .eq("club_id", team.club_id)
        .order("name", { ascending: true })
        .returns<{ id: string; name: string }[]>(),
      supabase
        .from("team_coaches")
        .select("team_id")
        .eq("profile_id", linkedProfileId)
        .returns<{ team_id: string }[]>(),
      supabase
        .from("players")
        .select("team_id")
        .eq("profile_id", linkedProfileId)
        .returns<{ team_id: string }[]>(),
    ]);
    teamRows = allTeams ?? [];
    coachSet = new Set((tc ?? []).map((r) => r.team_id));
    playerSet = new Set((pl ?? []).map((r) => r.team_id));
  }

  const c: EventCounts = {};
  for (const e of events ?? []) c[e.event_type] = (c[e.event_type] ?? 0) + 1;

  const acc = shootingAccuracy(c);
  const savePct = savePercentage(c);
  const isKeeper =
    player.position === "Portero" ||
    (c.save ?? 0) + (c.goal_conceded ?? 0) > 0;
  const faltas = (attendance ?? []).filter((a) => !a.attended).length;
  const asistencias = (attendance ?? []).filter((a) => a.attended).length;

  return (
    <Screen
      title={player.name}
      subtitle={[
        player.number != null ? `#${player.number}` : null,
        player.position,
        team?.name,
      ]
        .filter(Boolean)
        .join(" · ")}
      back={team ? `/teams/${team.id}` : "/teams"}
    >
      {/* Destacados */}
      <div className="flex gap-2">
        {isKeeper ? (
          <>
            <Stat label="Paradas" value={c.save ?? 0} />
            <Stat label="% Parada" value={savePct === null ? "–" : `${savePct}%`} />
            <Stat label="Encajados" value={c.goal_conceded ?? 0} />
          </>
        ) : (
          <>
            <Stat label="Goles" value={c.goal ?? 0} />
            <Stat label="% Tiro" value={acc === null ? "–" : `${acc}%`} />
            <Stat label="Asist." value={c.assist ?? 0} />
          </>
        )}
      </div>

      {/* Todas las estadísticas */}
      <div className="mt-5 mb-1.5 px-1">
        <span className="ios-section-caption">Estadísticas</span>
      </div>
      <ListGroup>
        {ORDER.filter((t) => (c[t] ?? 0) > 0).map((t) => (
          <ListRow
            key={t}
            leading={<span className="text-lg">{EVENT_LABELS[t].icon}</span>}
            title={EVENT_LABELS[t].label}
            value={<span className="font-mono text-[15px] text-label">{c[t]}</span>}
          />
        ))}
        {events && events.length === 0 && (
          <ListRow title="Sin estadísticas registradas" />
        )}
      </ListGroup>

      {/* Asistencia */}
      <div className="mt-5 mb-1.5 px-1">
        <span className="ios-section-caption">Entrenamientos</span>
      </div>
      <ListGroup>
        <ListRow title="Asistencias" value={asistencias} />
        <ListRow
          title="Faltas"
          value={
            <span className={faltas > 0 ? "font-semibold text-negative" : "text-label-2"}>
              {faltas}
            </span>
          }
        />
      </ListGroup>

      {/* Gestión de equipos de esta persona (admin) */}
      {isAdmin && linkedProfileId && teamRows.length > 0 && (
        <>
          <div className="mt-5 mb-1.5 px-1">
            <span className="ios-section-caption">Equipos</span>
          </div>
          <ul className="space-y-2">
            {teamRows.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-2xl bg-surface px-3 py-2.5"
              >
                <span className="min-w-0 truncate text-[14px] text-label">
                  {t.name}
                </span>
                <MembershipToggle
                  teamId={t.id}
                  profileId={linkedProfileId}
                  isCoach={coachSet.has(t.id)}
                  isPlayer={playerSet.has(t.id)}
                  canAssignCoach
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Observaciones del cuerpo técnico sobre el jugador (con su origen) */}
      <ObservationsSection
        observations={observations}
        canManage={canManage}
        ctx={{
          teamId: player.team_id,
          sourceType: "player",
          occurredAt: new Date().toISOString(),
        }}
        fixedPlayerId={player.id}
        showSource
      />
    </Screen>
  );
}
