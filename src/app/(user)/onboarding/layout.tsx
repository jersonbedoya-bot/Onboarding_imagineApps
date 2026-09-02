import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireActiveUser } from "@/server/auth/session";
import { resolveJourney } from "@/server/services/progress.service";
import { OnboardingTopbar } from "@/components/OnboardingTopbar";
import { EmptyState } from "@/components/EmptyState";
import { UserMenu } from "@/components/UserMenu";

/**
 * Chrome compartido de todo /onboarding/* (recorrido, equipo). Antes había
 * una tercera sección, Recursos, con su propia etapa siempre desbloqueada
 * fuera del recorrido secuencial — se eliminó (ver MIGRATIONS.md #8): sus
 * políticas pasaron a ser contenido real de "Tu Día a Día en Imagine Apps".
 * Antes cada página repetía el guard de identidad/rol y su propio topbar;
 * ahora vive acá una sola vez, y el layout decide si hay algo que mostrar
 * antes de renderizar la página pedida — por eso las páginas hijas ya no
 * necesitan su propio try/catch de auth.
 *
 * Antes esto era un panel lateral fijo (mapa de las 5 fases con salto
 * directo a cualquiera ya alcanzada) — se reemplazó por una barra
 * horizontal delgada (Bloque Y): esa navegación directa no se estaba
 * usando y le quitaba todo el ancho de pantalla al contenido. Si hace
 * falta más adelante, se puede reintroducir.
 */
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  let identity;
  try {
    identity = await requireActiveUser();
  } catch {
    redirect("/login");
  }

  if (!identity.functionalRoleId) {
    if (identity.platformRole === "ADMIN") {
      redirect("/admin/modules");
    }
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-6">
        <EmptyState
          title="No tenés un rol funcional asignado"
          description="Pedile a un administrador que te asigne un rol para poder ver tu onboarding."
        />
        <UserMenu />
      </main>
    );
  }

  const journey = await resolveJourney(identity);

  return (
    <div className="min-h-screen">
      <OnboardingTopbar stages={journey.stages} currentStageId={journey.currentStageId} />
      {children}
    </div>
  );
}
