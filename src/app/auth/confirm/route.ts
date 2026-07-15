import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Confirma enlaces de email de Supabase (registro y recuperación de contraseña).
 * Plantillas de email apuntando a:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}
 * También acepta el flujo PKCE (?code=…) por si la plantilla usa
 * {{ .ConfirmationURL }} con `redirectTo` a esta ruta.
 *
 * La recuperación de contraseña (`type=recovery`) siempre lleva a
 * /reset-password para que la persona defina una nueva contraseña.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next =
    type === "recovery"
      ? "/reset-password"
      : searchParams.get("next") ?? "/";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(new URL("/login?error=confirm", request.url));
}
