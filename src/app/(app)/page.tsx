import Link from "next/link";
import Screen from "@/components/ui/Screen";
import Card from "@/components/ui/Card";
import { ListGroup, ListRow, SectionTitle } from "@/components/ui/List";
import ClubBadge from "@/components/ui/ClubBadge";
import SignOutButton from "@/components/auth/SignOutButton";
import { createClient } from "@/lib/supabase/server";
import {
  canAdminister,
  getMyClub,
  getSessionProfile,
  isPlayer,
  isStaff,
  isTecnico,
} from "@/lib/auth";
import type { Match } from "@/lib/types/database";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export default async function HomePage() {
  const { profile } = await getSessionProfile();
  const club = await getMyClub();
  const supabase = await createClient();

  const roleLabel = profile?.is_superadmin
    ? "Administrador global"
    : canAdminister(profile)
      ? "Administrador"
      : isTecnico(profile)
        ? "Técnico"
        : isPlayer(profile)
          ? "Jugador"
          : "Entrenador";

  const now = new Date().toISOString();
  const [{ data: upcoming }, { data: recent }] = await Promise.all([
    supabase
      .from("matches")
      .select("*")
      .gte("date", now)
      .order("date", { ascending: true })
      .limit(1)
      .returns<Match[]>(),
    supabase
      .from("matches")
      .select("*")
      .eq("status", "finished")
      .order("date", { ascending: false })
      .limit(3)
      .returns<Match[]>(),
  ]);

  const next = upcoming?.[0];

  return (
    <Screen
      title={profile?.name ? `Hola, ${profile.name.split(" ")[0]}` : "Inicio"}
      subtitle={roleLabel}
    >
      {/* Hero del club */}
      <div className="mt-1 flex items-center gap-3 rounded-2xl bg-surface p-4">
        <ClubBadge name={club?.name} logoUrl={club?.logo_url} size={52} />
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold text-label">
            {club?.name ?? "Tu club"}
          </p>
          <p className="text-[13px] text-label-2">Temporada 2025/2026</p>
        </div>
      </div>

      {/* Próximo partido */}
      <SectionTitle>Próximo partido</SectionTitle>
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
          <p className="text-[14px] text-label-2">
            No hay partidos próximos programados.
          </p>
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
            <Link href="/matches" className="text-[13px] text-brand">
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
                  subtitle={fmt(m.date)}
                  value={
                    <span
                      className={`font-mono text-[15px] font-semibold ${
                        win
                          ? "text-positive"
                          : draw
                            ? "text-label-2"
                            : "text-negative"
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

      {/* Accesos */}
      <div className="mt-5">
        <ListGroup>
          {isStaff(profile) && (
            <ListRow
              href="/admin"
              title={canAdminister(profile) ? "Administración" : "Gestión"}
              subtitle="Miembros, roles y club"
              leading={<span className="text-xl">⚙️</span>}
            />
          )}
          <ListRow
            href="/stats"
            title="Estadísticas"
            subtitle="Acumulado por jugador"
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
