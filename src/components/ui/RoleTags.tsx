import type { UserRole } from "@/lib/types/database";

const LABEL: Record<UserRole, string> = {
  admin: "Admin",
  coach: "Entrenador",
  tecnico: "Técnico",
  player: "Jugador",
};

const COLOR: Record<UserRole, string> = {
  admin: "bg-brand/20 text-brand",
  coach: "bg-positive/15 text-positive",
  tecnico: "bg-warning/15 text-warning",
  player: "bg-surface-2 text-label-2",
};

/** Muestra los roles del usuario como etiquetas. */
export default function RoleTags({
  roles,
  superadmin,
}: {
  roles: UserRole[];
  superadmin?: boolean;
}) {
  const list = [...new Set(roles)];
  if (list.length === 0 && !superadmin) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {superadmin && (
        <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[11px] font-semibold text-brand">
          Admin global
        </span>
      )}
      {list.map((r) => (
        <span
          key={r}
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR[r]}`}
        >
          {LABEL[r]}
        </span>
      ))}
    </div>
  );
}
