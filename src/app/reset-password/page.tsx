"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // El enlace de recuperación ya dejó una sesión activa (vía /auth/confirm).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setReady(true);
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.replace("/");
      router.refresh();
    }, 1200);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/escudo-blanco.svg"
          alt="CBM Quart"
          width={104}
          className="mb-3 drop-shadow-[0_12px_34px_rgba(76,155,238,0.35)]"
        />
        <p className="text-[13px] font-extrabold uppercase tracking-[0.18em] text-sky-200">
          Nueva contraseña
        </p>
      </div>

      {!ready ? (
        <p className="text-sm text-label-2">Comprobando enlace…</p>
      ) : !hasSession ? (
        <div className="w-full max-w-xs space-y-3 text-center">
          <p className="text-sm text-label-2">
            El enlace de recuperación no es válido o ha caducado. Vuelve a
            solicitarlo desde el inicio de sesión.
          </p>
          <Link href="/login" className="btn btn-primary w-full py-3.5">
            Volver a inicio de sesión
          </Link>
        </div>
      ) : done ? (
        <p className="max-w-xs text-center text-sm text-emerald-400">
          Contraseña actualizada. Entrando…
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="Nueva contraseña (mín. 6)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-separator bg-surface px-4 py-3 text-label outline-none focus:border-brand"
          />
          <input
            type="password"
            name="confirm-password"
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="Repite la contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-xl border border-separator bg-surface px-4 py-3 text-label outline-none focus:border-brand"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-3.5"
          >
            {loading ? "Guardando…" : "Guardar contraseña"}
          </button>
        </form>
      )}
    </main>
  );
}
