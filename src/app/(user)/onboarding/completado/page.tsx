import { redirect } from "next/navigation";
import { requireActiveUser } from "@/server/auth/session";
import { resolveJourney } from "@/server/services/progress.service";
import { LinkButton } from "@/components/Button";
import { TerminalCelebration } from "../TerminalCelebration";

/**
 * Pantalla propia para el cierre del onboarding — antes "Terminar
 * Onboarding" solo hacía un router.refresh() en el mismo pager (ver
 * OnboardingJourney.advance), así que el usuario se quedaba mirando la
 * misma etapa de siempre: el único indicio de que algo pasó era el
 * FinishCard, arriba del todo, fuera de la vista si venías scrolleado
 * hasta el botón. El usuario lo reportó como "parece que no pasa nada".
 *
 * Ahora el botón navega ACÁ (ver OnboardingJourney.advance) — una llegada
 * real, no un refresh silencioso. El recorrido completo (con todo su
 * contenido) sigue existiendo en /onboarding para consulta; esto es solo
 * el momento de cierre, una vez.
 */
export default async function OnboardingCompletadoPage() {
  const identity = await requireActiveUser();
  const journey = await resolveJourney(identity);

  // Llegada por URL directa/compartida antes de terminar de verdad: no hay
  // nada que celebrar todavía, de vuelta al recorrido real.
  if (journey.currentStageId !== null) {
    redirect("/onboarding");
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <TerminalCelebration />

      <div className="mb-6 grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-brand-strong to-brand shadow-lg">
        <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10" aria-hidden="true">
          <path d="M12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.7 5.8 21 7 14 2 9.3 9 8.5z" fill="#fff" />
        </svg>
      </div>

      <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-soft bg-brand-tint px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand">
        Recorrido completo
      </span>

      <h1 className="text-gradient-brand font-display text-4xl font-semibold leading-tight sm:text-5xl">
        ¡Completaste tu onboarding!
      </h1>

      <p className="mx-auto mt-4 max-w-lg text-base text-ink-soft xl:text-lg">
        Gracias por tomarte el tiempo de leer, revisar cada etapa e interactuar de verdad con la plataforma — eso también
        es parte de hacer bien las cosas desde el primer día.
      </p>

      <p className="mx-auto mt-6 max-w-lg font-display text-lg font-semibold text-ink xl:text-xl">
        Lo extraordinario nunca estuvo lejos: ya lo estás haciendo.
      </p>

      <p className="mx-auto mt-6 max-w-md text-sm text-ink-soft">
        Todo lo que recorriste queda disponible para siempre — vuelve cuando lo necesites, como consulta, no como algo
        pendiente por hacer de nuevo.
      </p>

      <LinkButton href="/onboarding" className="mt-10">
        Ver todo el contenido
      </LinkButton>
    </main>
  );
}
