import AppHeader from "@/components/layout/AppHeader";

export default function MatchesPage() {
  return (
    <>
      <AppHeader title="Partidos" subtitle="Calendario y resultados" />
      <div className="mt-4 rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-400">
        Sin partidos programados. (Fase 2: crear partido y lanzar modo en vivo.)
      </div>
    </>
  );
}
