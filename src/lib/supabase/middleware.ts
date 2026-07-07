import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase en cada request y protege rutas privadas.
 * Se invoca desde el middleware raíz (src/middleware.ts).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: no ejecutar código entre createServerClient y la validación.
  // getClaims valida el JWT en local (clave asimétrica ES256) y refresca la
  // sesión si hace falta (vía getSession interno), sin ida y vuelta de red por
  // cada request/prefetch. La autorización real la aplica RLS en la BD.
  const { data: claims } = await supabase.auth.getClaims();
  const hasSession = Boolean(claims?.claims?.sub);

  // Rutas públicas (no requieren sesión). /api incluye el health-check keep-warm.
  const publicPaths = ["/login", "/auth", "/api"];
  const isPublic = publicPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
