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
    <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface p-4">
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
      {deferred ? (
        <button
          onClick={install}
          className="tap shrink-0 rounded-xl bg-brand px-3 py-2 text-[14px] font-semibold text-white"
        >
          Instalar
        </button>
      ) : (
        <button
          onClick={dismiss}
          className="shrink-0 rounded-xl px-2 py-2 text-[13px] text-label-3"
        >
          Ocultar
        </button>
      )}
    </div>
  );
}
