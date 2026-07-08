"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Ya instalada (abierta como app) → no mostrar nada.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    if (localStorage.getItem("bmapp-install-dismissed") === "1") return;

    // Solo en móvil/tablet (pantalla táctil): en PC no tiene sentido instalar.
    const isMobile =
      window.matchMedia("(pointer: coarse)").matches ||
      /iphone|ipad|ipod|android/i.test(window.navigator.userAgent);
    if (!isMobile) return;

    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    // Detección de entorno solo disponible en cliente (no en el render SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsIOS(ios);
    if (ios) setShow(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    setShow(false);
    localStorage.setItem("bmapp-install-dismissed", "1");
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 px-3">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-surface/95 p-3 shadow-xl ring-1 ring-separator/60 backdrop-blur-xl">
      <span className="text-2xl">📲</span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-label">Instala la app</p>
        {isIOS && !deferred ? (
          <p className="text-[13px] text-label-2">
            Toca <span className="text-brand">Compartir</span> ⬆️ y luego{" "}
            <span className="text-brand">“Añadir a pantalla de inicio”</span>.
          </p>
        ) : (
          <p className="text-[13px] text-label-2">
            Añádela a tu pantalla de inicio para abrirla como una app.
          </p>
        )}
      </div>
      {deferred && (
        <button
          onClick={install}
          className="tap shrink-0 rounded-xl bg-brand px-3 py-2 text-[14px] font-semibold text-white"
        >
          Instalar
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Cerrar"
        className="tap shrink-0 rounded-full p-1.5 text-label-3 hover:text-label"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      </div>
    </div>
  );
}
