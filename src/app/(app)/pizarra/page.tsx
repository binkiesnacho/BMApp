"use client";

import Screen from "@/components/ui/Screen";
import CourtDrawer from "@/components/court/CourtDrawer";

/**
 * Modo pizarra: pista táctica a pantalla para explicar en mitad del partido.
 * No guarda nada; el propio CourtDrawer incluye "Deshacer" (último trazo) y
 * "Limpiar".
 */
export default function PizarraPage() {
  return (
    <Screen title="Pizarra" subtitle="Modo explicación" back="/">
      <CourtDrawer value={null} onChange={() => {}} />
    </Screen>
  );
}
