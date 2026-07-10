import Link from "next/link";
import Card, { EmptyState } from "@/components/ui/Card";
import { ListGroup, ListRow } from "@/components/ui/List";
import RoleTags from "@/components/ui/RoleTags";
import { createClient } from "@/lib/supabase/server";
import { rolesOf } from "@/lib/auth";
import { shootingAccuracy, savePercentage, type EventCounts } from "@/lib/stats";
import RoleTabs from "@/app/(app)/mi-ficha/RoleTabs";
import type {
  Match,
  Player,
  Profile,
  StatEvent,
  Team,
  TrainingAttendance,
  UserRole,
} from "@/lib/types/database";

const TAB_ROLES: UserRole[] = ["player", "coach", "tecnico"];

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex-1 rounded-2xl bg-surface p-3 text-center">
      <p className="font-mono text-2xl font-bold text-brand">{value}</p>
      <p className="text-[12px] text-label-2">{label}</p>
    </div>
  );
}

type SB = Awaited<ReturnType<typeof createClient>>;

/**
 * Cuerpo unificado de la ficha de una persona (roles + pestañas por rol con sus
 * estadísticas). Se usa tanto en "Mi ficha" (self) como al abrir la ficha de un
 * miembro desde administración. `self=false` oculta las acciones personales.
 */
export default async function FichaBody({
  profile,
  activeTab,
  basePath = "/mi-ficha",
  self = true,
}: {
  profile: Profile;
  activeTab?: string;
  basePath?: string;
  self?: boolean;
}) {
  const roles = rolesOf(profile);
  const available = TAB_ROLES.filter((r) => roles.includes(r));
  const active =
    (activeTab && available.includes(activeTab as UserRole) && (activeTab as UserRole)) ||
    available[0];
  const supabase = await createClient();

  return (
    <>
      <div className="mb-3">
        <RoleTags roles={roles} superadmin={profile.is_superadmin} />
      </div>

      {available.length === 0 ? (
        <EmptyState icon="🪪">
          {self
            ? "No tienes rol de jugador, entrenador o técnico. Tu cuenta es de administración."
            : "Sin rol de jugador, entrenador o técnico."}
        </EmptyState>
      ) : (
        <>
          <RoleTabs available={available} value={active} basePath={basePath} />
          {active === "player" && <PlayerTab profileId={profile.id} supabase={supabase} />}
          {active === "coach" && (
            <CoachTab profileId={profile.id} supabase={supabase} self={self} />
          )}
          {active === "tecnico" && (
            <TecnicoTab teamId={profile.team_id} supabase={supabase} self={self} />
          )}
        </>
      )}
    </>
  );
}

/* ------------------------------ Jugador ---------------------------------- */
async function PlayerTab({ profileId, supabase }: { profileId: string; supabase: SB }) {
  const { data: fichas } = await supabase
    .from("players")
    .select("*")
    .eq("profile_id", profileId)
    .returns<Player[]>();

  if (!fichas || fichas.length === 0) {
    return (
      <EmptyState icon="👤">Sin ninguna ficha de jugador vinculada todavía.</EmptyState>
    );
  }

  const fichaIds = fichas.map((f) => f.id);
  const teamIds = [...new Set(fichas.map((f) => f.team_id))];
  const [{ data: teams }, { data: events }, { data: attendance }] =
    await Promise.all([
      supabase.from("teams").select("id, name").in("id", teamIds).returns<Pick<Team, "id" | "name">[]>(),
      supabase.from("stats_events").select("player_id, event_type").in("player_id", fichaIds).returns<Pick<StatEvent, "player_id" | "event_type">[]>(),
      supabase.from("training_attendance").select("player_id, attended").in("player_id", fichaIds).returns<Pick<TrainingAttendance, "player_id" | "attended">[]>(),
    ]);

  const teamName = (tid: string) => teams?.find((t) => t.id === tid)?.name ?? "Equipo";

  return (
    <div className="space-y-5">
      {fichas.map((f) => {
        const c: EventCounts = {};
        for (const e of events ?? [])
          if (e.player_id === f.id) c[e.event_type] = (c[e.event_type] ?? 0) + 1;
        const att = (attendance ?? []).filter((a) => a.player_id === f.id);
        const faltas = att.filter((a) => !a.attended).length;
        const asistencias = att.filter((a) => a.attended).length;
        const acc = shootingAccuracy(c);
        const savePct = savePercentage(c);
        const isKeeper =
          f.position === "Portero" || (c.save ?? 0) + (c.goal_conceded ?? 0) > 0;

        return (
          <div key={f.id}>
            <div className="mb-1.5 flex items-center justify-between px-1">
              <span className="ios-section-caption">
                {teamName(f.team_id)}
                {f.number != null ? ` · #${f.number}` : ""}
              </span>
              <Link href={`/players/${f.id}`} className="text-[13px] text-brand">
                Ver ficha
              </Link>
            </div>
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
            <div className="mt-2">
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
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------- Entrenador -------------------------------- */
async function CoachTab({
  profileId,
  supabase,
  self,
}: {
  profileId: string;
  supabase: SB;
  self: boolean;
}) {
  // Une equipos legacy (coach_id) y multi-entrenador (team_coaches).
  const [{ data: legacy }, { data: joins }] = await Promise.all([
    supabase.from("teams").select("*").eq("coach_id", profileId).returns<Team[]>(),
    supabase
      .from("team_coaches")
      .select("team:teams(*)")
      .eq("profile_id", profileId)
      .returns<{ team: Team | null }[]>(),
  ]);

  const byId = new Map<string, Team>();
  for (const t of legacy ?? []) byId.set(t.id, t);
  for (const j of joins ?? []) if (j.team) byId.set(j.team.id, j.team);
  const teams = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));

  if (teams.length === 0) {
    return <EmptyState icon="🧑‍🏫">Sin equipos entrenados todavía.</EmptyState>;
  }

  const ids = teams.map((t) => t.id);
  const now = new Date().toISOString();
  const { data: upcoming } = await supabase
    .from("matches")
    .select("*")
    .in("team_id", ids)
    .gte("date", now)
    .order("date", { ascending: true })
    .limit(5)
    .returns<Match[]>();

  const teamName = (tid: string) => teams.find((t) => t.id === tid)?.name ?? "Equipo";

  return (
    <div className="space-y-5">
      <div>
        <p className="ios-section-caption mb-1.5 px-1">Equipos</p>
        <ListGroup>
          {teams.map((t) => (
            <ListRow
              key={t.id}
              href={`/equipo/${t.id}`}
              title={t.name}
              subtitle="Plantilla, partidos y estadísticas"
              leading={<span className="text-xl">🛡️</span>}
            />
          ))}
        </ListGroup>
      </div>

      <div>
        <p className="ios-section-caption mb-1.5 px-1">Próximos partidos</p>
        {upcoming && upcoming.length > 0 ? (
          <ListGroup>
            {upcoming.map((m) => (
              <ListRow
                key={m.id}
                href={`/matches/${m.id}`}
                title={`vs ${m.opponent}`}
                subtitle={`${teamName(m.team_id)} · ${fmtShort(m.date)}`}
              />
            ))}
          </ListGroup>
        ) : (
          <Card>
            <p className="text-[14px] text-label-2">No hay partidos próximos.</p>
          </Card>
        )}
      </div>

      {self && (
        <Link href="/trainings/new" className="btn btn-primary w-full py-3.5">
          <span className="text-lg leading-none">＋</span> Nuevo entrenamiento
        </Link>
      )}
    </div>
  );
}

/* ------------------------------ Técnico ---------------------------------- */
async function TecnicoTab({
  teamId,
  supabase,
  self,
}: {
  teamId: string | null;
  supabase: SB;
  self: boolean;
}) {
  if (!teamId) {
    return (
      <EmptyState icon="🎯">
        {self
          ? "Aún no tienes un equipo asignado como técnico. Pídele al club que te asigne uno."
          : "Sin equipo asignado como técnico."}
      </EmptyState>
    );
  }

  const now = new Date().toISOString();
  const [{ data: team }, { data: upcoming }] = await Promise.all([
    supabase.from("teams").select("*").eq("id", teamId).maybeSingle<Team>(),
    supabase
      .from("matches")
      .select("*")
      .eq("team_id", teamId)
      .gte("date", now)
      .order("date", { ascending: true })
      .limit(5)
      .returns<Match[]>(),
  ]);

  if (!team) {
    return <EmptyState icon="🎯">El equipo asignado ya no existe.</EmptyState>;
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="ios-section-caption mb-1.5 px-1">Equipo</p>
        <ListGroup>
          <ListRow
            href={`/equipo/${team.id}`}
            title={team.name}
            subtitle="Plantilla, partidos y estadísticas"
            leading={<span className="text-xl">🛡️</span>}
          />
        </ListGroup>
      </div>

      <div>
        <p className="ios-section-caption mb-1.5 px-1">Próximos partidos (captura en vivo)</p>
        {upcoming && upcoming.length > 0 ? (
          <ListGroup>
            {upcoming.map((m) => (
              <ListRow
                key={m.id}
                href={`/matches/${m.id}`}
                title={`vs ${m.opponent}`}
                subtitle={fmtShort(m.date)}
              />
            ))}
          </ListGroup>
        ) : (
          <Card>
            <p className="text-[14px] text-label-2">No hay partidos próximos.</p>
          </Card>
        )}
      </div>

      {self && (
        <Link href="/trainings/new" className="btn btn-primary w-full py-3.5">
          <span className="text-lg leading-none">＋</span> Nuevo entrenamiento
        </Link>
      )}
    </div>
  );
}
