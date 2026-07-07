import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Cachea en el cliente los segmentos ya visitados: volver a una sección (o
    // ir atrás) es instantáneo, sin re-render en el servidor. Las mutaciones
    // siguen refrescando al momento vía revalidatePath.
    staleTimes: {
      dynamic: 90,
      static: 300,
    },
  },
};

export default nextConfig;
