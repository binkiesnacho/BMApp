import Link from "next/link";

/**
 * Chrome de pantalla estilo iOS: barra superior translúcida con título grande,
 * botón atrás opcional y una acción a la derecha. El contenido va debajo, con
 * espacio inferior para la tab bar.
 */
export default function Screen({
  title,
  subtitle,
  back,
  trailing,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  trailing?: React.ReactNode;
  /** Botón de acción flotante anclado abajo; la lista hace scroll por debajo. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-separator/40 bg-canvas/70 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+1.25rem)] backdrop-blur-xl">
        {(back || trailing) && (
          <div className="flex h-8 items-center justify-between">
            {back ? (
              <Link
                href={back}
                className="tap -ml-1 flex items-center gap-0.5 text-[15px] font-medium text-brand"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15 18l-6-6 6-6"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Atrás
              </Link>
            ) : (
              <span />
            )}
            <div className="text-[15px] font-medium text-brand">{trailing}</div>
          </div>
        )}
        <div className="pt-0.5">
          <h1 className="ios-large-title text-label">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[13px] text-label-2">{subtitle}</p>}
        </div>
      </header>

      <main
        className={`px-4 pt-3 ${
          action
            ? "pb-[calc(9.5rem+env(safe-area-inset-bottom))]"
            : "pb-[calc(5.75rem+env(safe-area-inset-bottom))]"
        }`}
      >
        {children}
      </main>

      {action && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md pb-[calc(env(safe-area-inset-bottom)+4.9rem)]">
          {/* Degradado para que la lista se desvanezca al pasar bajo el botón */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-canvas via-canvas/85 to-transparent" />
          <div className="relative px-4">
            <div className="pointer-events-auto">{action}</div>
          </div>
        </div>
      )}
    </>
  );
}
