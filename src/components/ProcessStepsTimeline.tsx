import { MarkdownContent } from "@/components/MarkdownContent";
import { VideoEmbed } from "@/components/VideoEmbed";
import { PendingBadge } from "@/components/PendingBadge";
import { cn } from "@/lib/cn";
import type { VideoProvider } from "@/types/enums";

export type TimelineStep = {
  id: string;
  title: string;
  description?: string | null;
  instruction?: string | null;
  videoUrl?: string | null;
  videoProvider?: VideoProvider | null;
};

/**
 * Pasos de un proceso como stepper numerado (círculo + línea vertical
 * conectora) en vez de una lista plana con separadores — un proceso ES una
 * secuencia ordenada; antes ese orden quedaba implícito en el array, ahora
 * el layout lo comunica. `allCompleted` viene del proceso entero (no hay
 * completado parcial por paso — ver CompleteProcessButton) y convierte
 * todos los números en check verde de una sola vez.
 */
export function ProcessStepsTimeline({
  steps,
  allCompleted,
  isStepPending,
}: {
  steps: TimelineStep[];
  allCompleted: boolean;
  isStepPending: (title: string) => boolean;
}) {
  return (
    <ol className="mt-4 flex flex-col">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const pending = isStepPending(step.title);
        return (
          <li key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && (
              <span
                aria-hidden="true"
                className={cn("absolute left-[15px] top-8 bottom-0 w-px", allCompleted ? "bg-success-soft" : "bg-line")}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-bold tabular-nums",
                allCompleted ? "bg-success-soft text-success" : "border-2 border-brand-soft bg-card text-brand-strong",
              )}
            >
              {allCompleted ? (
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
              <span className="flex flex-wrap items-center gap-2 font-display text-base font-semibold text-ink xl:text-lg">
                {step.title}
                {pending && <PendingBadge />}
              </span>
              {step.description && <MarkdownContent>{step.description}</MarkdownContent>}
              {step.instruction && <MarkdownContent>{step.instruction}</MarkdownContent>}
              {step.videoUrl && <VideoEmbed src={step.videoUrl} title={step.title} provider={step.videoProvider} />}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
