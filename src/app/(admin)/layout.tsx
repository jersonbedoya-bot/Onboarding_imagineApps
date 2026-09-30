import type { ReactNode } from "react";
import { requireActiveUser } from "@/server/auth/session";
import { AdminNav } from "@/components/admin/AdminNav";
import { UserMenu } from "@/components/UserMenu";
import { Logo } from "@/components/Logo";

// Nombre de la sección que administra este panel — hoy hay una sola
// (Onboarding de Operaciones), pero nombrarla en vez de decir genéricamente
// "Admin" le da al nav una jerarquía real: Sección > páginas (Módulos,
// Mensajes, Líderes, Usuarios, Auditoría), no solo una lista plana sin
// contexto de qué se está administrando.
const ADMIN_SECTION_NAME = "Onboarding de Operaciones";

// Chrome compartido por TODO /admin — evita repetir el contenedor, la
// franja superior y la nav en cada page.tsx. Cada page.tsx sigue haciendo
// su propio guard (requireAdmin/requireContentEditor) + redirectForGuardError (src/server/auth/guard-redirect.ts);
// acá solo se necesita saber el platformRole para filtrar la nav de EDITOR
// (sin Usuarios/Auditoría/Mensajes) — por eso el catch cae a "USER" en vez
// de redirigir, dejando que el guard de la page propia sea quien de verdad
// decide si la request sigue.
//
// max-w-[90rem] (antes max-w-5xl/64rem) — pedido explícito del usuario: en
// una pantalla ancha el panel se sentía "una caja angosta en el medio" con
// mucho margen vacío a los costados, quedando MÁS angosto que el propio
// recorrido de onboarding (que ya usa hasta xl:max-w-6xl). Las tablas
// (Usuarios, Auditoría) son justo el contenido que más se beneficia de más
// ancho antes de necesitar scroll horizontal.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const platformRole = await requireActiveUser()
    .then((identity) => identity.platformRole)
    .catch(() => "USER" as const);

  return (
    // Sin bg-paper: dejaba el panel en un solo color plano, tapando el
    // degradado de marca de body::before (globals.css). La franja superior
    // es translúcida, igual que el header de imagineapps.co.
    <div className="min-h-screen">
      <div className="border-b border-line bg-paper/60 backdrop-blur">
        <div className="mx-auto flex max-w-[90rem] items-center gap-3 px-6 py-3">
          <Logo className="flex-shrink-0 text-base" />
          {/* Oculto por debajo de sm: en celular no entra junto al logo y al
              menú de usuario y quedaba truncado ("ONBOARDIN…"). */}
          <span aria-hidden className="hidden h-4 w-px flex-shrink-0 bg-line sm:block" />
          <span className="hidden min-w-0 flex-shrink truncate text-xs font-bold uppercase tracking-widest text-brand-strong sm:block">
            {ADMIN_SECTION_NAME}
          </span>
          <div className="flex-1" />
          <UserMenu />
        </div>
        <div className="mx-auto max-w-[90rem] px-6 pb-2">
          <AdminNav platformRole={platformRole} />
        </div>
      </div>
      <main className="mx-auto max-w-[90rem] px-6 py-8">{children}</main>
    </div>
  );
}
