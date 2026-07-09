import Link from "next/link";
import Screen from "@/components/ui/Screen";
import Card from "@/components/ui/Card";
import { ListGroup, ListRow } from "@/components/ui/List";
import ClubBadge from "@/components/ui/ClubBadge";
import RoleTags from "@/components/ui/RoleTags";
import SignOutButton from "@/components/auth/SignOutButton";
import { createClient } from "@/lib/supabase/server";
import {
  canAdminister,
  getMyClub,
  getMyTeams,
  getSessionProfile,
  isStaff,
  rolesOf,
} from "@/lib/auth";
import type { Match, Training } from "@/lib/types/database";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export default async function HomePage() {
  const { profile } = await getSessionProfile();
  const [club, myTeams] = await Promise.all([getMyClub(), getMyTeams()]);
  const supabase = await createClient();

  const myTeamIds = myTeams.map((t) => t.id);
  const hasTeam = myTeamIds.length > 0;
  const now = new Date().toISOString();

  // Datos acotados a MIS equipos (si tengo); si no, a todo el club (fallback).
  const upcomingQ = supabase
    .from("matches")
    .select("*")
    .gte("date", now)
    .order("date", { ascending: true })
    .limit(1);
  const recentQ = supabase
    .from("matches")
    .select("*")
    .eq("status", "finished")
    .order("date", { ascending: false })
    .limit(3);
  const trainingsQ = supabase
    .from("trainings")
    .select("*")
    .order("date", { ascending: false })
    .limit(2);

  const [{ data: upcoming }, { data: recent }, { data: trainings }] =
    await Promise.all([
      (hasTeam ? upcomingQ.in("team_id", myTeamIds) : upcomingQ).returns<Match[]>(),
      (hasTeam ? recentQ.in("team_id", myTeamIds) : recentQ).returns<Match[]>(),
      (hasTeam
        ? trainingsQ.in("team_id", myTeamIds)
        : trainingsQ
      ).returns<Training[]>(),
    ]);

  const next = upcoming?.[0];
  const teamLabel =
    myTeams.length === 1
      ? myTeams[0].name
      : myTeams.length > 1
        ? "Mis equipos"
        : null;

  return (
    <Screen title={profile?.name ? `Hola, ${profile.name.split(" ")[0]}` : "Inicio"}>
      {/* Marca de agua de la mascota (lobo CBM Quart), silueta tintada vía máscara. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-5 top-6 -z-10 h-56 w-56 opacity-[0.06]"
        style={{
          WebkitMaskImage: "url(/brand/lobo.svg)",
          maskImage: "url(/brand/lobo.svg)",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          backgroundColor: "var(--color-sky-200)",
        }}
      />

      <div className="mb-3">
        <RoleTags roles={rolesOf(profile)} superadmin={profile?.is_superadmin} />
      </div>

      {/* Administración (staff) */}
      {isStaff(profile) && (
        <Link
          href="/admin"
          className="tap mt-1 flex items-center gap-3 rounded-2xl bg-surface p-4"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-xl">
            ⚙️
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-label">
              {canAdminister(profile) ? "Administración" : "Gestión"}
            </p>
            <p className="text-[13px] text-label-2">Miembros, roles y club</p>
          </div>
          <Chevron />
        </Link>
      )}

      {/* Club: acceso a todos los equipos */}
      <Link
        href="/teams"
        className="tap mt-3 flex items-center gap-3 rounded-2xl bg-surface p-4"
      >
        <ClubBadge name={club?.name} logoUrl={club?.logo_url} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-label">
            {club?.name ?? "Club"}
          </p>
          <p className="text-[13px] text-label-2">Ver todos los equipos</p>
        </div>
        <Chevron />
      </Link>

      {/* Mi equipo */}
      <div className="mt-5 flex items-center justify-between px-1">
        <span className="ios-section-caption">{teamLabel ?? "Mi actividad"}</span>
        {myTeams.length === 1 && (
          <Link href={`/teams/${myTeams[0].id}`} className="text-[13px] text-brand">
            Ver equipo
          </Link>
        )}
      </div>

      {/* Próximo partido */}
      {next ? (
        <Link href={`/matches/${next.id}`} className="tap block">
          <Card>
            <p className="text-[13px] text-brand">{fmt(next.date)}</p>
            <p className="mt-0.5 text-[17px] font-semibold text-label">
              vs {next.opponent}
            </p>
            {next.location && (
              <p className="mt-0.5 text-[13px] text-label-2">📍 {next.location}</p>
            )}
          </Card>
        </Link>
      ) : (
        <Card>
          <p className="text-[14px] text-label-2">No hay partidos próximos.</p>
          <Link href="/matches" className="mt-1 inline-block text-[14px] text-brand">
            Ver calendario →
          </Link>
        </Card>
      )}

      {/* Últimos resultados */}
      {recent && recent.length > 0 && (
        <>
          <div className="mt-5 mb-1.5 flex items-center justify-between px-1">
            <span className="ios-section-caption">Últimos resultados</span>
            <Link href="/matches?tab=resultados" className="text-[13px] text-brand">
              Ver todos
            </Link>
          </div>
          <ListGroup>
            {recent.map((m) => {
              const win = m.our_score > m.opp_score;
              const draw = m.our_score === m.opp_score;
              return (
                <ListRow
                  key={m.id}
                  href={`/matches/${m.id}`}
                  title={`vs ${m.opponent}`}
                  subtitle={fmtShort(m.date)}
                  value={
                    <span
                      className={`font-mono text-[15px] font-semibold ${
                        win ? "text-positive" : draw ? "text-label-2" : "text-negative"
                      }`}
                    >
                      {m.our_score}–{m.opp_score}
                    </span>
                  }
                />
              );
            })}
          </ListGroup>
        </>
      )}

      {/* Entrenamientos */}
      {trainings && trainings.length > 0 && (
        <>
          <div className="mt-5 mb-1.5 flex items-center justify-between px-1">
            <span className="ios-section-caption">Entrenamientos</span>
            <Link href="/trainings" className="text-[13px] text-brand">
              Ver todos
            </Link>
          </div>
          <ListGroup>
            {trainings.map((t) => (
              <ListRow
                key={t.id}
                href={`/trainings/${t.id}`}
                title={t.title || "Entrenamiento"}
                subtitle={fmtShort(t.date)}
                leading={<span className="text-lg">🏋️</span>}
              />
            ))}
          </ListGroup>
        </>
      )}

      {/* Estadísticas */}
      <div className="mt-5">
        <ListGroup>
          <ListRow
            href={hasTeam ? `/stats?team=${myTeamIds[0]}` : "/stats"}
            title="Estadísticas"
            subtitle={hasTeam ? "De tu equipo" : "Del club"}
            leading={<span className="text-xl">📊</span>}
          />
        </ListGroup>
      </div>

      <div className="mt-5 flex justify-center">
        <SignOutButton />
      </div>
    </Screen>
  );
}

function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-label-3">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
