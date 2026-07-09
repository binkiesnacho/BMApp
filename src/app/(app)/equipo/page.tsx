import { redirect } from "next/navigation";
import Screen from "@/components/ui/Screen";
import { TileGrid, Tile } from "@/components/ui/Tile";
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
      <TileGrid>
        {myTeams.map((team) => (
          <Tile
            key={team.id}
            href={`/equipo/${team.id}`}
            title={team.name}
          />
        ))}
      </TileGrid>
    </Screen>
  );
}
