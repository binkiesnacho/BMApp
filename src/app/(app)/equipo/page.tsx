import { redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { ListGroup, ListRow } from "@/components/ui/List";
import { EmptyState } from "@/components/ui/Card";
import { getMyTeams } from "@/lib/auth";

export const metadata = { title: "Equipo" };

export default async function EquipoPage() {
  const myTeams = await getMyTeams();

  if (myTeams.length === 0) {
    return (
      <Screen title="Equipos">
        <EmptyState icon="🛡️">
          Aún no perteneces a ningún equipo. Pídele a tu club una invitación o que
          te asignen uno.
        </EmptyState>
      </Screen>
    );
  }

  // Con un solo equipo, saltamos el selector y vamos directos a su panel.
  if (myTeams.length === 1) redirect(`/equipo/${myTeams[0].id}`);

  return (
    <Screen title="Equipos" subtitle="Elige un equipo">
      <ListGroup>
        {myTeams.map((team) => (
          <ListRow
            key={team.id}
            href={`/equipo/${team.id}`}
            title={team.name}
            leading={
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15 text-[15px]">
                🛡️
              </span>
            }
          />
        ))}
      </ListGroup>
    </Screen>
  );
}
