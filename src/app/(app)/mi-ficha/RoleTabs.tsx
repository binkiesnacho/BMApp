"use client";

import { useRouter } from "next/navigation";
import Segmented from "@/components/ui/Segmented";
import type { UserRole } from "@/lib/types/database";

const LABEL: Record<string, string> = {
  player: "Jugador",
  coach: "Entrenador",
  tecnico: "Técnico",
};

/** Tabs de ficha según los roles de la persona. Navega con ?tab= sobre basePath. */
export default function RoleTabs({
  available,
  value,
  basePath = "/mi-ficha",
}: {
  available: UserRole[];
  value: UserRole;
  basePath?: string;
}) {
  const router = useRouter();
  if (available.length < 2) return null;
  return (
    <div className="mb-4">
      <Segmented<UserRole>
        value={value}
        onChange={(v) => router.push(`${basePath}?tab=${v}`, { scroll: false })}
        options={available.map((r) => ({ value: r, label: LABEL[r] ?? r }))}
      />
    </div>
  );
}
