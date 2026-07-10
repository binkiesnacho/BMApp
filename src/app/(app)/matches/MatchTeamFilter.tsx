import FilterPills from "@/components/ui/FilterPills";

type Opt = { id: string; name: string };

/** Filtro por equipo del calendario. Conserva la pestaña activa (`tab`). */
export default function MatchTeamFilter({
  teams,
  value,
  tab,
  showAll,
}: {
  teams: Opt[];
  value: string;
  tab: string;
  showAll: boolean;
}) {
  const options = [
    ...teams.map((t) => ({ value: t.id, label: t.name })),
    ...(showAll ? [{ value: "all", label: "Todos" }] : []),
  ];
  return (
    <FilterPills
      options={options}
      value={value}
      ariaLabel="Filtrar por equipo"
      hrefFor={(v) => `/matches?team=${v}&tab=${tab}`}
    />
  );
}
