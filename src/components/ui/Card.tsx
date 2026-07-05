/** Tarjeta agrupada estilo iOS. */
export default function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-surface p-4 ${className}`}>{children}</div>
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
