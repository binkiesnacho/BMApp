import type { MetadataRoute } from "next";

/**
 * Web App Manifest (servido en /manifest.webmanifest).
 * Next.js genera la ruta automáticamente desde este archivo.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BMApp — Gestión de Balonmano",
    short_name: "BMApp",
    description:
      "Gestión de plantillas, partidos y estadísticas in-game de balonmano.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
