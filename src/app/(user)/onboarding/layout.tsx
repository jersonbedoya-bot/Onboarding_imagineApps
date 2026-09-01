import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireActiveUser } from "@/server/auth/session";
import { resolveJourney } from "@/server/services/progress.service";
import { OnboardingSidebar } from "@/components/OnboardingSidebar";
import { EmptyState } from "@/components/EmptyState";
import { UserMenu } from "@/components/UserMenu";

/**
 * Chrome compartido de todo /onboarding/* (recorrido, equipo, recursos).
 * Antes cada página repetía el guard de identidad/rol y su propio
 * <OnboardingTopbar/>; ahora vive acá una sola vez, y el layout decide si
 * hay algo que mostrar antes de renderizar la página pedida — por eso las
 * páginas hijas ya no necesitan su propio try/catch de auth.
 *
 * El sidebar es el mapa del recorrido (Bloque 2): las 4 fases reales +
 * "Cierre y Seguimiento" (sintética, no es un stage — ver comentario en
 * OnboardingSidebar) quedan separadas de Recursos, que es independiente
 * del avance secuencial.
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
    <div className="lg:flex lg:min-h-screen">
      <OnboardingSidebar
        stages={journey.stages.filter((stage) => stage.key !== "recursos")}
        currentStageId={journey.currentStageId}
      />
      <div className="min-w-0 lg:flex-1">{children}</div>
    </div>
  );
}
