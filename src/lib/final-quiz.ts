import { parseQuizQuestions } from "@/lib/content-display";

type JourneyLike = {
  currentStageId: string | null;
  stages: { items: { displayFormat?: string | null; viewed?: boolean | null; body?: string | null }[] }[];
};

/**
 * currentStageId === null solo dice que no queda nada OBLIGATORIO: el quiz
 * del último módulo (INFORMATIONAL, no cuenta para el progreso) todavía
 * puede faltar. Pasarlo deja su registro `view` (ver OnboardingJourney.
 * advance) = item.viewed. Solo cuenta un quiz que se puede mostrar (body
 * parseable): uno roto nunca abre el gate y dejaría el recorrido sin cierre.
 * Única fuente de la regla para el topbar (layout), la FinishCard (page) y
 * /onboarding/completado.
 */
export function isFinalQuizPending(journey: JourneyLike): boolean {
  const lastStage = journey.stages.at(-1);
  return (
    journey.currentStageId === null &&
    !!lastStage?.items.some((item) => item.displayFormat === "QUIZ" && !item.viewed && !!item.body && parseQuizQuestions(item.body) !== null)
  );
}
