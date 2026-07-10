import FilterPills from "@/components/ui/FilterPills";

type Opt = { id: string; name: string };

/** Filtro por equipo de la lista de entrenamientos. */
export default function TrainingsTeamFilter({
  teams,
  value,
  showAll,
}: {
  teams: Opt[];
  value: string;
  showAll: boolean;
}) {
  const options = [
    ...(showAll ? [{ value: "all", label: "Todos" }] : []),
    ...teams.map((t) => ({ value: t.id, label: t.name })),
  ];
  return (
    <FilterPills
      options={options}
      value={value}
      ariaLabel="Filtrar por equipo"
      hrefFor={(v) => `/trainings?team=${v}`}
    />
  );
}
