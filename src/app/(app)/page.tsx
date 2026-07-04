import Link from "next/link";
import AppHeader from "@/components/layout/AppHeader";
import SignOutButton from "@/components/auth/SignOutButton";
import { canAdminister, getSessionProfile } from "@/lib/auth";

const quickActions = [
  { href: "/teams", title: "Mis equipos", desc: "Plantillas y jugadores", icon: "🛡️" },
  { href: "/matches", title: "Partidos", desc: "Calendario y resultados", icon: "🤾" },
  { href: "/matches/live", title: "Partido en vivo", desc: "Toma de estadísticas", icon: "⏱️" },
  { href: "/stats", title: "Estadísticas", desc: "Análisis del equipo", icon: "📊" },
];

export default async function DashboardPage() {
  const { profile } = await getSessionProfile();
  const isAdmin = canAdminister(profile);
  const roleLabel = profile?.is_superadmin
    ? "Administrador global"
    : isAdmin
      ? "Administrador"
      : "Entrenador";

  const actions = isAdmin
    ? [
        {
          href: "/admin",
          title: "Administración",
          desc: "Club, miembros y equipos",
          icon: "⚙️",
        },
        ...quickActions,
      ]
    : quickActions;

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
