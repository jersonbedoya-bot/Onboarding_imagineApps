import { redirect } from "next/navigation";
import { requireActiveUser } from "@/server/auth/session";
import { resolveJourney } from "@/server/services/progress.service";
import { OnboardingCompletion } from "@/components/OnboardingCompletion";

/**
 * Pantalla propia para el cierre del onboarding — antes "Terminar
 * Onboarding" solo hacía un router.refresh() en el mismo pager (ver
 * OnboardingJourney.advance), así que el usuario se quedaba mirando la
 * misma etapa de siempre. Ahora el botón navega ACÁ: una llegada real. El
 * contenido vive en OnboardingCompletion, compartido con
 * /admin/preview/completado.
 */
export default async function OnboardingCompletadoPage() {
  const identity = await requireActiveUser();
  const journey = await resolveJourney(identity);

  // Llegada por URL directa/compartida antes de terminar de verdad: no hay
  // nada que celebrar todavía, de vuelta al recorrido real.
  if (journey.currentStageId !== null) {
    redirect("/onboarding");
  }

  return <OnboardingCompletion exitHref="/onboarding" exitLabel="Ver todo el contenido" />;
}
