import Link from "next/link";

/** Rejilla de botones cuadrados redondeados (2 columnas). */
export function TileGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

/**
 * Botón cuadrado redondeado: solo texto (sin escudo/emoji), con un punto de luz
 * y una flecha de navegación. Pensado para hubs de equipo/club.
 */
export function Tile({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="tap group relative flex aspect-square flex-col justify-end overflow-hidden rounded-3xl border border-separator bg-surface p-4 shadow-[0_14px_40px_rgba(6,12,30,0.35)] hover:border-brand/50"
    >
      {/* Punto de luz de marca en la esquina */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand/25 blur-2xl transition-opacity group-hover:opacity-80" />

      {/* Flecha de navegación */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        className="absolute right-3.5 top-3.5 text-label-3 transition-colors group-hover:text-sky-200"
      >
        <path
          d="M7 17 17 7M9 7h8v8"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="relative">
        <div className="text-[17px] font-extrabold leading-tight text-label">
          {title}
        </div>
        {subtitle && (
          <div className="mt-1 text-[12px] leading-snug text-label-2">
            {subtitle}
          </div>
        )}
      </div>
    </Link>
  );
}
