import { redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { ListGroup, ListRow } from "@/components/ui/List";
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
      <ListGroup>
        <ListRow
          href="/admin/members"
          title="Miembros"
          subtitle="Roles y equipos"
          leading={<span className="text-xl">👥</span>}
        />
        <ListRow
          href="/admin/invites"
          title="Invitaciones"
          subtitle="Códigos por rol y equipo"
          leading={<span className="text-xl">✉️</span>}
        />
        {isAdmin && (
          <ListRow
            href="/admin/teams"
            title="Equipos"
            subtitle="Crear, renombrar y entrenadores"
            leading={<span className="text-xl">🛡️</span>}
          />
        )}
        {isAdmin && (
          <ListRow
            href="/admin/club"
            title="Club"
            subtitle="Nombre y logo"
            leading={<span className="text-xl">🏟️</span>}
          />
        )}
      </ListGroup>
    </Screen>
  );
}
