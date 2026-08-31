"use client";

import { cn } from "@/lib/cn";

export type StepperStage = { id: string; unlocked: boolean; complete: boolean };

/**
 * Indicador compacto de posición (tipo "miga de pan") para el recorrido de
 * onboarding — círculos numerados conectados por una línea, sin nombres de
 * etapa (antes se listaba el título completo de cada una, y con títulos
 * largos se veía desprolijo). Cada círculo desbloqueado es clickeable y
 * salta directo a esa etapa; los bloqueados se muestran con candado, sin
 * click.
 */
export function StageStepper({
  stages,
  activeId,
  onSelect,
}: {
  stages: StepperStage[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav aria-label="Progreso del recorrido" className="mb-8 flex items-center justify-center gap-1.5 overflow-x-auto py-1">
      {stages.map((stage, index) => {
        const isActive = stage.id === activeId;
        return (
          <div key={stage.id} className="flex items-center gap-1.5">
            {index > 0 && (
              <span
                className={cn("h-px w-4 flex-shrink-0 sm:w-6", stages[index - 1].complete ? "bg-success" : "bg-line")}
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              disabled={!stage.unlocked}
              onClick={() => onSelect(stage.id)}
              aria-current={isActive ? "step" : undefined}
              aria-label={`Etapa ${index + 1}${stage.complete ? " — completa" : !stage.unlocked ? " — bloqueada" : ""}`}
              className={cn(
                "grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border-2 text-xs font-bold tabular-nums transition-colors",
                isActive && "border-brand bg-brand text-white",
                !isActive && stage.unlocked && stage.complete && "border-success bg-success text-white",
                !isActive && stage.unlocked && !stage.complete && "border-line bg-card text-ink-soft hover:border-brand-soft",
                !stage.unlocked && "cursor-not-allowed border-line bg-paper text-ink-soft/50",
              )}
            >
              {!isActive && stage.unlocked && stage.complete ? (
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : !stage.unlocked ? (
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth={2} />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth={2} />
                </svg>
              ) : (
                index + 1
              )}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
