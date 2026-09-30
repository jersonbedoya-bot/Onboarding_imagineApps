import { LinkButton } from "@/components/Button";
import { TerminalCelebration } from "@/app/(user)/onboarding/TerminalCelebration";

/**
 * Pantalla de cierre del onboarding. Compartida entre la real
 * (onboarding/completado) y /admin/preview/completado, para que Admin/Editor
 * vean exactamente lo mismo que un Imaginer al terminar; solo cambia a dónde
 * lleva el botón final.
 */
export function OnboardingCompletion({ exitHref, exitLabel }: { exitHref: string; exitLabel: string }) {
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

      <h1 className="text-gradient-brand font-display text-4xl font-semibold leading-tight sm:text-5xl">¡Completaste tu onboarding!</h1>

      <p className="mx-auto mt-4 max-w-lg text-base text-ink-soft xl:text-lg">
        Gracias por tomarte el tiempo de leer, revisar cada módulo e interactuar de verdad con la plataforma — eso también es
        parte de hacer bien las cosas desde el primer día.
      </p>

      <p className="mx-auto mt-6 max-w-lg font-display text-lg font-semibold text-ink xl:text-xl">
        Lo extraordinario nunca estuvo lejos: ya lo estás haciendo.
      </p>

      <p className="mx-auto mt-6 max-w-md text-sm text-ink-soft">
        Todo lo que recorriste queda disponible para siempre — vuelve cuando lo necesites, como consulta, no como algo pendiente
        por hacer de nuevo.
      </p>

      <LinkButton href={exitHref} className="mt-10">
        {exitLabel}
      </LinkButton>
    </main>
  );
}
