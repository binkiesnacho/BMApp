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
  icon,
}: {
  href: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Icono/emoji opcional mostrado como badge en la esquina superior. */
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="tap group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl border border-separator bg-surface p-3 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_10px_30px_-18px_rgba(0,0,0,0.7)] hover:border-brand/50 hover:bg-surface-2/60"
    >
      {/* Punto de luz de marca en la esquina */}
      <div className="pointer-events-none absolute -right-7 -top-7 h-20 w-20 rounded-full bg-brand/25 blur-2xl transition-opacity group-hover:opacity-80" />

      {/* Icono (badge) + flecha de navegación */}
      <div className="absolute inset-x-3 top-3 flex items-start justify-between">
        {icon ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15 text-[17px] leading-none">
            {icon}
          </span>
        ) : (
          <span />
        )}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          className="mt-0.5 text-label-3 transition-colors group-hover:text-sky-200"
        >
          <path
            d="M7 17 17 7M9 7h8v8"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="relative">
        <div className="text-[15px] font-extrabold leading-tight text-label">
          {title}
        </div>
        {subtitle && (
          <div className="mt-0.5 text-[11px] leading-snug text-label-2">
            {subtitle}
          </div>
        )}
      </div>
    </Link>
  );
}
