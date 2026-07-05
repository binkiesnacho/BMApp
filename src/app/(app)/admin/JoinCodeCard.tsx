"use client";

import { useState } from "react";

export default function JoinCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard no disponible: el usuario puede copiar manualmente.
    }
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-separator bg-canvas px-4 py-3">
      <div>
        <p className="text-xs text-label-2">Código de invitación</p>
        <p className="font-mono text-lg tracking-widest text-brand">{code}</p>
      </div>
      <button
        onClick={copy}
        className="rounded-lg border border-separator px-3 py-1.5 text-xs text-label hover:border-brand"
      >
        {copied ? "¡Copiado!" : "Copiar"}
      </button>
    </div>
  );
}
