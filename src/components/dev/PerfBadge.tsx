"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Insignia de medición de rendimiento (solo para diagnóstico).
 * Se activa visitando cualquier página con ?perf=1 y se apaga con ?perf=0 o
 * tocándola. Muestra, en el propio dispositivo:
 *  - carga completa: TTFB (servidor+red) y total.
 *  - navegación interna: clic→transición y duración del fetch de datos (RSC),
 *    que es la espera real que se percibe.
 */
export default function PerfBadge() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const clickAt = useRef<number | null>(null);
  const lastRsc = useRef<number | null>(null);
  const first = useRef(true);

  // Activación por ?perf=1 / ?perf=0 (persiste en localStorage).
  useEffect(() => {
    try {
      const p = new URLSearchParams(location.search).get("perf");
      if (p === "1") localStorage.setItem("bmperf", "1");
      if (p === "0") localStorage.removeItem("bmperf");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEnabled(localStorage.getItem("bmperf") === "1");
    } catch {}
  }, []);

  // Marca el inicio al pulsar un enlace interno.
  useEffect(() => {
    if (!enabled) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.("a[href^='/']");
      if (a) clickAt.current = performance.now();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [enabled]);

  // Observa los fetch de datos (RSC) para medir servidor+red de cada navegación.
  useEffect(() => {
    if (!enabled || typeof PerformanceObserver === "undefined") return;
    const obs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const r = e as PerformanceResourceTiming;
        if (
          r.initiatorType === "fetch" &&
          r.name.startsWith(location.origin) &&
          !r.name.includes("/_next/static")
        ) {
          lastRsc.current = Math.round(r.responseEnd - r.startTime);
        }
      }
    });
    obs.observe({ type: "resource", buffered: false });
    return () => obs.disconnect();
  }, [enabled]);

  // Carga completa (primera vez) o navegación interna (cambios de pathname).
  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      requestAnimationFrame(() => {
        const nav = performance.getEntriesByType(
          "navigation"
        )[0] as PerformanceNavigationTiming | undefined;
        if (nav) {
          setLine1(`carga TTFB ${Math.round(nav.responseStart)}ms`);
          setLine2(`total ${Math.round(nav.duration)}ms`);
        }
      });
      return;
    }
    const start = clickAt.current;
    clickAt.current = null;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const commit = start ? Math.round(performance.now() - start) : null;
        setLine1(pathname.length > 22 ? pathname.slice(0, 22) + "…" : pathname);
        setLine2(
          `${commit != null ? `clic→ ${commit}ms` : ""}${
            lastRsc.current != null ? `  datos ${lastRsc.current}ms` : ""
          }`.trim() || "…"
        );
      })
    );
  }, [pathname, enabled]);

  if (!enabled) return null;
  return (
    <button
      onClick={() => {
        try {
          localStorage.removeItem("bmperf");
        } catch {}
        setEnabled(false);
      }}
      style={{
        position: "fixed",
        left: 8,
        bottom: "calc(4.75rem + env(safe-area-inset-bottom))",
        zIndex: 60,
      }}
      className="rounded-xl bg-black/80 px-2.5 py-1 text-left font-mono text-[10px] leading-tight text-white"
      aria-label="Medición de rendimiento (tocar para ocultar)"
    >
      <div>⚡ {line1 || "…"}</div>
      {line2 && <div className="text-white/70">{line2}</div>}
    </button>
  );
}
