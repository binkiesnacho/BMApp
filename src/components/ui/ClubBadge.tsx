/* eslint-disable @next/next/no-img-element -- logo remoto de Supabase Storage, sin optimización de next/image */

/**
 * Escudo del club: muestra el logo subido si existe; si no, el escudo CBM Quart.
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
    <img
      src="/brand/escudo-blanco.svg"
      alt={name ?? "CBM Quart"}
      width={size}
      height={size}
      className="shrink-0 rounded-2xl object-contain"
      style={{ width: size, height: size, background: "#0B1226" }}
    />
  );
}
