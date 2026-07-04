import AppHeader from "@/components/layout/AppHeader";

export default function StatsPage() {
  return (
    <>
      <AppHeader title="Estadísticas" subtitle="Análisis del equipo" />
      <div className="mt-4 rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-400">
        Todavía no hay datos. (Fase 3: agregados de goles, paradas, exclusiones…)
      </div>
    </>
  );
}
