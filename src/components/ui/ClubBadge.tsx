/* eslint-disable @next/next/no-img-element -- logo remoto de Supabase Storage, sin optimización de next/image */

/**
 * Escudo del club: muestra el logo si existe, o un monograma con las iniciales.
 */
export default function ClubBadge({
  name,
  logoUrl,
  size = 44,
}: {
  name?: string | null;
  logoUrl?: string | null;
  size?: number;
}) {
  const initials = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name ?? "Club"}
        width={size}
        height={size}
        className="shrink-0 rounded-2xl bg-white object-contain"
        style={{ width: size, height: size, padding: size * 0.08 }}
      />
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-2xl bg-brand/15 font-bold text-brand"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials || "🤾"}
    </div>
  );
}
