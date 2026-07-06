/**
 * Esqueleto de carga (Suspense) para las rutas de la app. Da feedback inmediato
 * al navegar: la cabecera y unas filas "fantasma" aparecen al instante mientras
 * el servidor prepara los datos, en vez de una pantalla en blanco.
 */
export default function Loading() {
  return (
    <>
      <header className="safe-top sticky top-0 z-30 border-b border-separator/40 bg-canvas/70 px-4 pb-2 backdrop-blur-xl">
        <div className="pt-0.5">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-surface-2" />
        </div>
      </header>
      <main className="px-4 pt-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))]">
        <div className="space-y-2.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl bg-surface p-4"
            >
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-surface-2" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3.5 w-2/5 animate-pulse rounded bg-surface-2" />
                <div className="h-3 w-3/5 animate-pulse rounded bg-surface-2" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
