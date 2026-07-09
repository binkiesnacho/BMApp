import { redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { TileGrid, Tile } from "@/components/ui/Tile";
import { canAdminister, getMyClub, getSessionProfile, isStaff } from "@/lib/auth";

export const metadata = { title: "Administración" };

export default async function AdminPage() {
  const { profile } = await getSessionProfile();
  if (!profile?.club_id) redirect("/onboarding");
  if (!isStaff(profile)) redirect("/");
  const isAdmin = canAdminister(profile);
  const club = await getMyClub();

  return (
    <Screen
      title={isAdmin ? "Administración" : "Gestión"}
      subtitle={club?.name ?? "Tu club"}
    >
      <TileGrid>
        <Tile
          href="/admin/members"
          title="Miembros"
          subtitle="Roles y equipos"
          icon="👥"
        />
        <Tile
          href="/admin/invites"
          title="Invitaciones"
          subtitle="Códigos por rol y equipo"
          icon="✉️"
        />
        {isAdmin && (
          <Tile
            href="/admin/teams"
            title="Equipos"
            subtitle="Crear, renombrar y entrenadores"
            icon="🛡️"
          />
        )}
        {isAdmin && (
          <Tile
            href="/admin/club"
            title="Club"
            subtitle="Nombre y logo"
            icon="🏟️"
          />
        )}
      </TileGrid>
    </Screen>
  );
}
