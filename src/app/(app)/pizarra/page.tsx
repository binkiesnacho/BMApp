"use client";

import { useEffect } from "react";
import Screen from "@/components/ui/Screen";
import CourtDrawer from "@/components/court/CourtDrawer";

/**
 * Modo pizarra: pista táctica a pantalla para explicar en mitad del partido.
 * No guarda nada; el propio CourtDrawer incluye "Deshacer" (último trazo) y
 * "Limpiar".
 *
 * La app está bloqueada a vertical (manifest `orientation: portrait`). Esta es
 * la única pantalla que permite girar a horizontal: al entrar desbloqueamos la
 * orientación y al salir la volvemos a fijar en vertical. Donde el navegador no
 * soporte la API (iOS), simplemente se mantiene el bloqueo del manifest.
 */
export default function PizarraPage() {
  useEffect(() => {
    const orientation = window.screen?.orientation as
      | (ScreenOrientation & { lock?: (o: string) => Promise<void> })
      | undefined;
    orientation?.lock?.("any").catch(() => {});
    return () => {
      orientation?.lock?.("portrait").catch(() => {});
    };
  }, []);

  return (
    <Screen title="Pizarra" subtitle="Modo explicación" back="/">
      <CourtDrawer value={null} onChange={() => {}} fill />
    </Screen>
  );
}
