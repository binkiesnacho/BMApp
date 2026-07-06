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
  calendar: (p: IconProps) => (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2.5" fill={p.active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 9h16M8 3v3M16 3v3" stroke={p.active ? "var(--color-canvas)" : "currentColor"} strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
};

const items = [
  { href: "/", label: "Inicio", icon: Icon.home },
  { href: "/teams", label: "Club", icon: Icon.teams },
  { href: "/equipo", label: "Equipo", icon: Icon.equipo },
  { href: "/matches", label: "Calendario", icon: Icon.calendar },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-separator/50 bg-canvas/80 backdrop-blur-xl"
    >
      <ul className="mx-auto flex max-w-md items-stretch">
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] font-medium ${
                  active ? "text-brand" : "text-label-3"
                }`}
              >
                <svg width="26" height="26" viewBox="0 0 24 24">
                  {item.icon({ active })}
                </svg>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
