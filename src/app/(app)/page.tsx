import Link from "next/link";
import AppHeader from "@/components/layout/AppHeader";
import SignOutButton from "@/components/auth/SignOutButton";
import {
  canAdminister,
  getSessionProfile,
  isPlayer,
  isStaff,
  isTecnico,
} from "@/lib/auth";

export default async function DashboardPage() {
  const { profile } = await getSessionProfile();
  const isAdmin = canAdminister(profile);
  const player = isPlayer(profile);

  const roleLabel = profile?.is_superadmin
    ? "Administrador global"
    : isAdmin
      ? "Administrador"
      : isTecnico(profile)
        ? "Técnico"
        : player
          ? "Jugador"
          : "Entrenador";

  const staff = isStaff(profile);
  const actions = [
    ...(staff
      ? [
          {
            href: "/admin",
            title: isAdmin ? "Administración" : "Gestión",
            desc: isAdmin ? "Club, miembros y equipos" : "Miembros y roles",
            icon: "⚙️",
          },
        ]
      : []),
    {
      href: "/teams",
      title: player ? "Mi equipo" : "Equipos",
      desc: "Plantillas y jugadores",
      icon: "🛡️",
    },
    {
      href: "/matches",
      title: "Partidos",
      desc: player ? "Resultados y eventos" : "Calendario y en vivo",
      icon: "🤾",
    },
    {
      href: "/trainings",
      title: "Entrenamientos",
      desc: player ? "Sesiones y asistencia" : "Sesiones, fases y faltas",
      icon: "🏋️",
    },
    {
      href: "/stats",
      title: "Estadísticas",
      desc: "Acumulado por jugador",
      icon: "📊",
    },
  ];

  return (
    <>
      <AppHeader
        title={profile?.name ? `Hola, ${profile.name}` : "BMApp"}
        subtitle={roleLabel}
        action={<SignOutButton />}
      />

      <section className="mt-4 grid grid-cols-2 gap-3">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-brand/60 active:scale-[0.98]"
          >
            <span className="text-2xl">{a.icon}</span>
            <div className="mt-6">
              <p className="font-semibold text-slate-100">{a.title}</p>
              <p className="text-xs text-slate-400">{a.desc}</p>
            </div>
          </Link>
        ))}
      </section>
    </>
  );
}
