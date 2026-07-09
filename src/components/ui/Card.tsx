/** Tarjeta agrupada estilo iOS. */
export default function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-separator bg-[linear-gradient(180deg,var(--color-surface),#0f1a38)] p-4 shadow-[0_14px_40px_rgba(6,12,30,0.45)] ${className}`}
    >
      {children}
    </div>
  );
}

/** Estado vacío con icono y texto centrados. */
export function EmptyState({
  icon,
  children,
}: {
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-separator/70 p-8 text-center">
      {icon && <div className="mb-2 text-3xl">{icon}</div>}
      <p className="text-[14px] text-label-2">{children}</p>
    </div>
  );
}
