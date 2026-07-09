"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace("/");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error) throw error;

        // Si la confirmación por email está desactivada, hay sesión inmediata.
        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setInfo(
            "Cuenta creada. Revisa tu email para confirmar la cuenta y luego inicia sesión."
          );
          setMode("signin");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ha ocurrido un error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <div className="mb-2 text-4xl">🤾</div>
        <h1 className="text-xl font-semibold text-label">BMApp</h1>
        <p className="text-sm text-label-2">Gestión de balonmano</p>
      </div>

      <div className="flex w-full max-w-xs rounded-xl border border-separator/60 p-1 text-sm">
        <button
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-lg py-2 ${
            mode === "signin" ? "bg-brand text-white" : "text-label-2"
          }`}
        >
          Iniciar sesión
        </button>
        <button
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-lg py-2 ${
            mode === "signup" ? "bg-brand text-white" : "text-label-2"
          }`}
        >
          Crear cuenta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        {mode === "signup" && (
          <input
            type="text"
            required
            placeholder="Tu nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-separator bg-surface px-4 py-3 text-label outline-none focus:border-brand"
          />
        )}
        <input
          type="email"
          inputMode="email"
          required
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-separator bg-surface px-4 py-3 text-label outline-none focus:border-brand"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Contraseña (mín. 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-separator bg-surface px-4 py-3 text-label outline-none focus:border-brand"
        />

        {error && <p className="text-sm text-red-400">{error}</p>}
        {info && <p className="text-sm text-emerald-400">{info}</p>}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full py-3.5"
        >
          {loading
            ? "Procesando…"
            : mode === "signin"
              ? "Entrar"
              : "Crear cuenta"}
        </button>
      </form>
    </main>
  );
}
