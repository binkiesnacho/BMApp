"use client";

import { useRouter } from "next/navigation";
import Segmented from "@/components/ui/Segmented";
import type { UserRole } from "@/lib/types/database";

const LABEL: Record<string, string> = {
  player: "Jugador",
  coach: "Entrenador",
  tecnico: "Técnico",
};

/** Tabs de "Mi ficha" según los roles del usuario. Navega con ?tab=. */
export default function RoleTabs({
  available,
  value,
}: {
  available: UserRole[];
  value: UserRole;
}) {
  const router = useRouter();
  if (available.length < 2) return null;
  return (
    <div className="mb-4">
      <Segmented<UserRole>
        value={value}
        onChange={(v) => router.push(`/mi-ficha?tab=${v}`, { scroll: false })}
        options={available.map((r) => ({ value: r, label: LABEL[r] ?? r }))}
      />
    </div>
  );
}
