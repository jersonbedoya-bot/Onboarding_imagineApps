"use client";

import { useState } from "react";
import type { resolveJourney } from "@/server/services/progress.service";
import { StageStepper } from "@/components/StageStepper";
import { CompleteStepButton } from "./CompleteStepButton";
import { MarkAsReadButton } from "./MarkAsReadButton";
import { ContentViewTracker } from "./ContentViewTracker";
import { ProgressBar } from "@/components/ProgressBar";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { VideoEmbed } from "@/components/VideoEmbed";
import { MarkdownContent } from "@/components/MarkdownContent";

type Journey = Awaited<ReturnType<typeof resolveJourney>>;
type JourneyStage = Journey["stages"][number];

/**
 * Antes se mostraban TODAS las etapas apiladas en una sola página larga
 * (scroll infinito) con una lista de navegación arriba que se perdía de
 * vista al bajar. Acá se muestra una etapa a la vez — el stepper de arriba
 * ubica en qué etapa estás y permite saltar a cualquier otra desbloqueada,
 * y "Siguiente módulo" avanza recién cuando la etapa siguiente ya está
 * desbloqueada (o sea, cuando terminaste lo necesario de la actual).
 */
export function OnboardingJourney({ stages, currentStageId }: { stages: JourneyStage[]; currentStageId: string | null }) {
  const initialIndex = Math.max(
    0,
    stages.findIndex((s) => s.id === currentStageId),
  );
  const [index, setIndex] = useState(initialIndex);
  const stage = stages[index];
  const prevStage = stages[index - 1] ?? null;
  const nextStage = stages[index + 1] ?? null;

  function selectById(id: string) {
    const found = stages.findIndex((s) => s.id === id);
    if (found !== -1) setIndex(found);
  }

  return (
    <div>
      <StageStepper
        stages={stages.map((s) => ({ id: s.id, unlocked: s.unlocked, complete: s.status === "COMPLETE" }))}
        activeId={stage.id}
        onSelect={selectById}
      />

      <StageSection stage={stage} index={index} isCurrent={stage.id === currentStageId} />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        {prevStage ? (
          <Button variant="secondary" className="px-4 py-2 text-sm" onClick={() => setIndex(index - 1)}>
            ‹ Módulo anterior
          </Button>
        ) : (
          <span />
        )}
        {nextStage &&
          (nextStage.unlocked ? (
            <Button className="px-4 py-2 text-sm" onClick={() => setIndex(index + 1)}>
              Siguiente módulo ›
            </Button>
          ) : (
            <p className="text-xs text-ink-soft">Completá lo pendiente de esta etapa para avanzar.</p>
          ))}
      </div>
    </div>
  );
}

function StageSection({ stage, index, isCurrent }: { stage: JourneyStage; index: number; isCurrent: boolean }) {
  return (
    <section>
      <div className="mb-6 flex items-start gap-4">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-brand-tint font-display text-base font-semibold tabular-nums text-brand">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1 pt-1">
          {(isCurrent || !stage.unlocked || stage.status === "COMPLETE") && (
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              {isCurrent && <Badge variant="brand">Etapa actual</Badge>}
              {!stage.unlocked && <Badge variant="neutral">Bloqueada</Badge>}
              {stage.status === "COMPLETE" && <Badge variant="success">Completa</Badge>}
            </div>
          )}
          <h2 className="font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">{stage.title}</h2>
        </div>
      </div>

      {stage.readOnly ? (
        <p className="mb-6 text-sm text-ink-soft">Contenido de consulta — no requiere acciones.</p>
      ) : (
        <div className="mb-6 max-w-xs">
          <ProgressBar
            value={stage.totalCompletable > 0 ? (stage.completedCount / stage.totalCompletable) * 100 : 100}
            label={`${stage.completedCount}/${stage.totalCompletable}`}
          />
        </div>
      )}

      {!stage.unlocked ? null : (
        <div className="flex flex-col gap-4">
          {stage.items.length > 0 && (
            <Card>
              <ul className="flex flex-col gap-5">
                {stage.items.map((item) => (
                  <li key={item.id} className="flex flex-col gap-2 border-b border-line pb-5 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="font-display text-lg font-semibold leading-snug text-ink">{item.title}</p>
                      {item.requirement === "OBLIGATORY" && (
                        <MarkAsReadButton contentItemId={item.id} completed={item.completed} />
                      )}
                    </div>
                    <ContentViewTracker
                      contentItemId={item.id}
                      initialViewed={item.viewed ?? false}
                      enabled={item.requirement !== "OBLIGATORY"}
                    >
                      {item.body && <MarkdownContent>{item.body}</MarkdownContent>}
                      {item.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={item.title} className="max-h-80 w-full rounded-md border border-line object-cover" />
                      )}
                      {item.videoUrl && <VideoEmbed src={item.videoUrl} title={item.title} provider={item.videoProvider} />}
                    </ContentViewTracker>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {stage.processes.map((process) => (
            <Card key={process.id}>
              <h3 className="font-display text-xl font-semibold text-ink">{process.title}</h3>
              {process.objective && <MarkdownContent className="mt-1">{process.objective}</MarkdownContent>}
              {process.context && <MarkdownContent className="mt-1">{process.context}</MarkdownContent>}
              {process.expectedResult && <MarkdownContent className="mt-1">{process.expectedResult}</MarkdownContent>}
              <ul className="mt-4 flex flex-col gap-4">
                {process.steps.map((step) => (
                  <li key={step.id} className="flex flex-col gap-2 border-b border-line pb-4 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="font-display text-base font-semibold text-ink">{step.title}</span>
                      <CompleteStepButton stepId={step.id} completed={step.completed} />
                    </div>
                    {step.description && <MarkdownContent>{step.description}</MarkdownContent>}
                    {step.instruction && <MarkdownContent>{step.instruction}</MarkdownContent>}
                    {step.videoUrl && <VideoEmbed src={step.videoUrl} title={step.title} provider={step.videoProvider} />}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
