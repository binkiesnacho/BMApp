export const metadata = { title: "Sin conexión" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="text-4xl">📡</span>
      <h1 className="text-lg font-semibold text-slate-100">Sin conexión</h1>
      <p className="max-w-xs text-sm text-slate-400">
        No hay internet ahora mismo. Los eventos capturados en vivo se
        guardarán localmente y se sincronizarán al recuperar la conexión.
      </p>
    </main>
  );
}
