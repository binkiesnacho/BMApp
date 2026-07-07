import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Se ejecuta en cada petición (no cachear): un pinger externo la llama cada pocos
// minutos para evitar que la función serverless se enfríe (arranques en frío).
export const dynamic = "force-dynamic";

export async function GET() {
  const t0 = Date.now();
  // Toque mínimo a la BD para mantener caliente también el pooler de Supabase.
  // Sin sesión, la RLS no devuelve filas: solo importa ejecutar la consulta.
  let db = "skip";
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("clubs").select("id").limit(1);
    db = error ? "error" : "ok";
  } catch {
    db = "error";
  }
  return NextResponse.json(
    { ok: true, db, ms: Date.now() - t0 },
    { headers: { "Cache-Control": "no-store" } }
  );
}
