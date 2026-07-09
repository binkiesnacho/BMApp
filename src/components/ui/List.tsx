import Link from "next/link";

/** Título de sección estilo iOS (caption en mayúsculas). */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="ios-section-caption mb-1.5 px-1">{children}</p>;
}

/** Contenedor de lista agrupada (inset, esquinas redondeadas). */
export function ListGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-separator bg-surface shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_10px_30px_-18px_rgba(0,0,0,0.7)]">
      <ul className="divide-y divide-separator">{children}</ul>
    </div>
  );
}

/** Fila de lista iOS: icono/avatar opcional, título, subtítulo, valor y chevron. */
export function ListRow({
  href,
  leading,
  title,
  subtitle,
  value,
  trailing,
}: {
  href?: string;
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const inner = (
    <div className="flex items-center gap-3 px-4 py-2.5">
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] text-label">{title}</div>
        {subtitle && (
          <div className="truncate text-[13px] text-label-2">{subtitle}</div>
        )}
      </div>
      {value && <div className="text-[15px] text-label-2">{value}</div>}
      {trailing}
      {href && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-label-3">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );

  if (href) {
    return (
      <li>
        <Link
          href={href}
          className="tap block hover:bg-surface-2/60 active:bg-surface-2"
        >
          {inner}
        </Link>
      </li>
    );
  }
  return <li>{inner}</li>;
}
