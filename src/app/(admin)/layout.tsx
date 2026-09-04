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
// su propio guard (requireAdmin/requireContentEditor) + redirect a /login;
// acá solo se necesita saber el platformRole para filtrar la nav de EDITOR
// (sin Usuarios/Auditoría/Mensajes) — por eso el catch cae a "USER" en vez
// de redirigir, dejando que el guard de la page propia sea quien de verdad
// decide si la request sigue.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const platformRole = await requireActiveUser()
    .then((identity) => identity.platformRole)
    .catch(() => "USER" as const);

  return (
    <div className="min-h-screen bg-paper">
      <div className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
          <Logo className="flex-shrink-0 text-base" />
          <span aria-hidden className="h-4 w-px flex-shrink-0 bg-line" />
          <span className="min-w-0 flex-shrink truncate text-xs font-bold uppercase tracking-widest text-brand-strong">
            {ADMIN_SECTION_NAME}
          </span>
          <div className="flex-1" />
          <UserMenu />
        </div>
        <div className="mx-auto max-w-5xl px-6 pb-2">
          <AdminNav platformRole={platformRole} />
        </div>
      </div>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
