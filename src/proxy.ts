import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth/auth";

// Todo lo que no está acá requiere sesión por default (seguro por defecto).
const PUBLIC_PATHS = new Set(["/", "/login", "/forgot-password", "/api/password-reset/request"]);

// Rutas públicas con un token en el path: quien tiene el link/token (que el
// admin comparte a mano, ver invitation.service y password-reset.service)
// puede usarlo sin estar logueado. `POST /api/invitations` (sin segmento
// extra, la creación por el admin) NO matchea acá y sigue protegida, igual
// que /api/users/[id]/password-reset-* (generar/descartar, solo admin).
function isPublicTokenRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/accept-invite/") ||
    /^\/api\/invitations\/[^/]+(\/accept)?$/.test(pathname) ||
    /^\/reset-password\/[^/]+$/.test(pathname) ||
    /^\/api\/password-reset\/[^/]+$/.test(pathname)
  );
}

/**
 * Chequeo OPTIMISTA únicamente: solo verifica que exista un JWT de sesión
 * válido, sin tocar Mongo (evita un round-trip a la base en cada
 * navegación/prefetch). Es una redirección de UX, no la línea de defensa
 * real — esa es requireActiveUser()/requireAdmin(), llamado explícitamente
 * en cada Route Handler y Server Component protegido.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname) || isPublicTokenRoute(pathname)) {
    return NextResponse.next();
  }

  const session = await auth();
  const isAuthenticated = Boolean(session?.userId);

  if (isAuthenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Debes iniciar sesión para continuar." } },
      { status: 401 },
    );
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Excluye las rutas propias de NextAuth (login/callback/csrf) y assets
  // estáticos: no solo los generados por Next (_next/static, _next/image)
  // sino cualquier archivo servido tal cual desde /public (logo.png, etc.)
  // — sin esto, el optimizador de imágenes hace un fetch interno a la ruta
  // del archivo, ese fetch no lleva la cookie de sesión, el middleware lo
  // redirige a /login, y el archivo llega como HTML en vez de imagen.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|avif)$).*)"],
};
