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
      className={`rounded-2xl border border-separator bg-surface p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_10px_30px_-18px_rgba(0,0,0,0.7)] ${className}`}
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
