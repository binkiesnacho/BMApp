"use client";

import { useEffect } from "react";

/**
 * Registra el service worker una vez montado el cliente.
 * Solo en producción para no interferir con el HMR de desarrollo.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registro fallido: la app sigue funcionando sin capacidades offline.
      });
    }
  }, []);

  return null;
}
