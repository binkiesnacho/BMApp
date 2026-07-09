"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconProps = { active: boolean };

const Icon = {
  home: (p: IconProps) => (
    <path
      d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z"
      fill={p.active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  ),
  teams: (p: IconProps) => (
    <>
      <circle cx="9" cy="9" r="3" fill={p.active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="17" cy="8" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15.5 19a4.5 4.5 0 0 1 5-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  matches: (p: IconProps) => (
    <>
      <circle cx="12" cy="12" r="8" fill={p.active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 4v16M4 12h16" stroke={p.active ? "var(--color-canvas)" : "currentColor"} strokeWidth="1.5" />
    </>
  ),
  trainings: (p: IconProps) => (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2.5" fill={p.active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 3.5h6v2.2H9z" fill="var(--color-canvas)" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 11h7M8.5 15h4" stroke={p.active ? "var(--color-canvas)" : "currentColor"} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  equipo: (p: IconProps) => (
    <path
      d="M12 3 5 5.5V11c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V5.5L12 3z"
      fill={p.active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  ),
  ficha: (p: IconProps) => (
    <>
      <circle cx="12" cy="8.5" r="3.2" fill={p.active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 20a7 7 0 0 1 14 0" fill={p.active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  calendar: (p: IconProps) => (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2.5" fill={p.active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 9h16M8 3v3M16 3v3" stroke={p.active ? "var(--color-canvas)" : "currentColor"} strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  pizarra: (p: IconProps) => (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" fill={p.active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 20h8M12 17v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8.5 10.5c1.2 0 1.2-2 2.4-2s1.2 2 2.4 2 1.2-2 2.4-2" stroke={p.active ? "var(--color-canvas)" : "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  stats: (p: IconProps) => (
    <>
      <path d="M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="6" y="11" width="3" height="6" rx="1" fill={p.active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" />
      <rect x="11" y="7" width="3" height="10" rx="1" fill={p.active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" />
      <rect x="16" y="13" width="3" height="4" rx="1" fill={p.active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" />
    </>
  ),
};

export default function BottomNav({
  fichaHref,
  statsHref,
  pizarra = false,
}: {
  fichaHref: string;
  statsHref: string;
  pizarra?: boolean;
}) {
  const pathname = usePathname();

  // `activePath` es el prefijo de pathname (sin query) que marca la pestaña activa.
  const items = [
    { href: "/", label: "Inicio", icon: Icon.home, activePath: "/", exact: true },
    { href: fichaHref, label: "Mi ficha", icon: Icon.ficha, activePath: "/mi-ficha" },
    { href: "/equipo", label: "Equipo", icon: Icon.equipo, activePath: "/equipo" },
    { href: "/matches", label: "Calendario", icon: Icon.calendar, activePath: "/matches" },
    { href: "/trainings", label: "Entrenos", icon: Icon.trainings, activePath: "/trainings" },
    ...(pizarra
      ? [{ href: "/pizarra", label: "Pizarra", icon: Icon.pizarra, activePath: "/pizarra" }]
      : []),
    { href: statsHref, label: "Estadísticas", icon: Icon.stats, activePath: "/stats" },
  ];

  // Con 7 ítems (cuerpo técnico ve la pizarra) reducimos el tamaño para que la
  // píldora quepa en pantallas estrechas.
  const big = items.length <= 6;
  const cell = big ? "h-[52px] w-[52px]" : "h-11 w-11";
  const svg = big ? 27 : 23;

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)]">
      <ul
        className={`pointer-events-auto flex items-center rounded-full border border-separator/70 bg-[rgba(15,26,56,0.82)] py-2 shadow-[0_12px_40px_rgba(4,10,28,0.6)] backdrop-blur-xl ${
          big ? "gap-1 px-2" : "gap-0.5 px-1.5"
        }`}
      >
        {items.map((item, i) => {
          const active =
            "exact" in item && item.exact
              ? pathname === item.activePath
              : pathname.startsWith(item.activePath);
          return (
            <li key={i}>
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={`flex ${cell} items-center justify-center rounded-full transition-colors ${
                  active
                    ? "bg-gradient-to-b from-sky to-brand text-white shadow-[0_6px_16px_-4px_rgba(46,109,224,0.7),inset_0_1px_0_rgba(255,255,255,0.25)]"
                    : "text-label-3 hover:text-label-2"
                }`}
              >
                <svg width={svg} height={svg} viewBox="0 0 24 24">
                  {item.icon({ active })}
                </svg>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
