"use client";

import { Fragment, useState } from "react";
import type { resolveJourney } from "@/server/services/progress.service";
import { CompleteStepButton } from "./CompleteStepButton";
import { MarkAsReadButton } from "./MarkAsReadButton";
import { ContentViewTracker } from "./ContentViewTracker";
import { ProgressBar } from "@/components/ProgressBar";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { VideoEmbed } from "@/components/VideoEmbed";
import { MarkdownContent } from "@/components/MarkdownContent";
import { PendingBadge } from "@/components/PendingBadge";
import { TeamTeaser } from "@/components/TeamTeaser";
import { HistoryTimeline } from "@/components/HistoryTimeline";
import { ImpactProjectsGrid } from "@/components/ImpactProjectsGrid";
import { LeadersBoard } from "./leaders/LeadersBoard";
import type { LeaderCardData } from "./leaders/LeaderCard";
import { groupProcesses, FASE_02_STAGE_KEY, FASE_04_STAGE_KEY, type GroupedProcesses } from "@/lib/phase-groups";
import { isPendingProcess, isPendingStep, isPendingContentItem } from "@/lib/pending-content";
import { isHistoryTimelineContent, isImpactProjectsContent, parseTimelineItems, parseImpactProjects } from "@/lib/institutional-content";
import { cn } from "@/lib/cn";

type Journey = Awaited<ReturnType<typeof resolveJourney>>;
type JourneyStage = Journey["stages"][number];
type JourneyProcess = JourneyStage["processes"][number];

/**
 * Antes se mostraban TODAS las etapas apiladas en una sola página larga
 * (scroll infinito). Acá se muestra una etapa a la vez — "Siguiente
 * módulo" avanza recién cuando la etapa siguiente ya está desbloqueada (o
 * sea, cuando terminaste lo necesario de la actual). `page.tsx` sigue
 * aceptando `?stage=<id>` para abrir una etapa puntual (sin UI propia hoy
 * — el topbar, OnboardingTopbar, ya no ofrece salto directo, ver su
 * comentario), así que `currentStageId` puede llegar ya resuelto a una
 * etapa distinta de la actual del usuario.
 */
export function OnboardingJourney({
  stages,
  currentStageId,
  equipoCount,
  roleLabel,
  gerencia,
}: {
  stages: JourneyStage[];
  currentStageId: string | null;
  equipoCount: number;
  roleLabel: string | null;
  gerencia: LeaderCardData[];
}) {
  const initialIndex = Math.max(
    0,
    stages.findIndex((s) => s.id === currentStageId),
  );
  const [index, setIndex] = useState(initialIndex);
  const stage = stages[index];
  const prevStage = stages[index - 1] ?? null;
  const nextStage = stages[index + 1] ?? null;

  return (
    <div>
      <StageSection
        stage={stage}
        index={index}
        isCurrent={stage.id === currentStageId}
        equipoCount={equipoCount}
        roleLabel={roleLabel}
        gerencia={gerencia}
      />

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

/**
 * Orientación breve (Bloque 3): "dónde estoy" ya lo dan el número + título;
 * esta línea contesta "cómo está organizado" en un solo renglón, sin
 * inventar contenido de rol — solo cuenta lo que ya existe en los datos.
 */
function organizationSummary(stage: JourneyStage, groups: GroupedProcesses<JourneyProcess>[] | null): string | null {
  if (!groups) return null;
  const totalProcesses = stage.processes.length;
  const unit = stage.key === FASE_02_STAGE_KEY ? "momentos de un mismo ciclo" : "grupos por tema";
  return `${totalProcesses} ${totalProcesses === 1 ? "proceso" : "procesos"} organizados en ${groups.length} ${unit}.`;
}

function StageSection({
  stage,
  index,
  isCurrent,
  equipoCount,
  roleLabel,
  gerencia,
}: {
  stage: JourneyStage;
  index: number;
  isCurrent: boolean;
  equipoCount: number;
  roleLabel: string | null;
  gerencia: LeaderCardData[];
}) {
  const groups = groupProcesses(stage.key, stage.processes);
  // Por defecto abre el primer grupo con trabajo pendiente (si ya
  // terminaste todo, cae en el primero). Se recalcula si `stage` cambia
  // (prev/next o el sidebar remontan esta sección — ver nota de arriba).
  const defaultGroupIndex = groups
    ? Math.max(
        0,
        groups.findIndex((g) => g.processes.some((p) => p.steps.some((s) => !s.completed))),
      )
    : 0;
  const [groupIndex, setGroupIndex] = useState(defaultGroupIndex);
  const activeGroup = groups ? (groups[Math.min(groupIndex, groups.length - 1)] ?? null) : null;
  const summary = organizationSummary(stage, groups);

  return (
    <section>
      <div className="mb-8 flex items-start gap-4">
        <span className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-strong font-display text-xl font-bold tabular-nums text-white shadow-md">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1 pt-1.5">
          {(isCurrent || !stage.unlocked || stage.status === "COMPLETE") && (
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              {isCurrent && <Badge variant="brand">Etapa actual</Badge>}
              {!stage.unlocked && <Badge variant="neutral">Bloqueada</Badge>}
              {stage.status === "COMPLETE" && <Badge variant="success">Completa</Badge>}
            </div>
          )}
          <h2 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">{stage.title}</h2>
        </div>
      </div>

      {stage.readOnly ? (
        <p className="mb-6 text-sm text-ink-soft">Contenido de consulta — no requiere acciones.</p>
      ) : (
        <div className="mb-2 max-w-xs">
          <ProgressBar
            value={stage.totalCompletable > 0 ? (stage.completedCount / stage.totalCompletable) * 100 : 100}
            label={`${stage.completedCount}/${stage.totalCompletable}`}
          />
        </div>
      )}
      {summary && <p className="mb-6 text-sm text-ink-soft">{summary}</p>}

      {!stage.unlocked ? null : (
        <div className="flex flex-col gap-4">
          {/* En Fase 04 este mismo Card es, hoy, la introducción de rol
              (Bloque 4) — un content_item real (scope ROLE, ver
              content.service) titulado "Tu rol como <rol>", cargado por
              findVisibleForRole igual que cualquier otro contenido: cada
              usuario ve solo el suyo, sin lógica especial acá. */}
          {stage.items.length > 0 && (
            <div className="flex flex-col gap-5">
              {stage.items.map((item) => {
                const pending = isPendingContentItem(item.title);
                // Fase 01 (Bloque de historia): "Hitos que nos Definieron" y
                // "Proyectos de Alto Impacto" son 2 content items fijos con
                // layout propio (timeline / grilla) en vez de texto plano —
                // ver institutional-content.ts. La gerencia (scope COMMON)
                // se embebe justo después de los hitos, como pidió el
                // usuario ("origen y trayectoria... ahí las cards de la
                // gerencia"), reusando el mismo LeadersBoard de /leaders.
                const isTimeline = isHistoryTimelineContent(item.title);
                const timelineItems = isTimeline && item.body ? parseTimelineItems(item.body) : null;
                const isProjects = isImpactProjectsContent(item.title);
                const projectItems = isProjects && item.body ? parseImpactProjects(item.body) : null;
                return (
                  <Fragment key={item.id}>
                    <Card className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <span className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-xl font-semibold leading-snug text-ink">{item.title}</p>
                          {pending && <PendingBadge />}
                        </span>
                        {item.requirement === "OBLIGATORY" && (
                          <MarkAsReadButton contentItemId={item.id} completed={item.completed} />
                        )}
                      </div>
                      <ContentViewTracker
                        contentItemId={item.id}
                        initialViewed={item.viewed ?? false}
                        enabled={item.requirement !== "OBLIGATORY"}
                      >
                        {timelineItems ? (
                          <HistoryTimeline items={timelineItems} />
                        ) : projectItems ? (
                          <ImpactProjectsGrid projects={projectItems} />
                        ) : (
                          item.body && <MarkdownContent>{item.body}</MarkdownContent>
                        )}
                        {item.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="max-h-80 w-full rounded-md border border-line object-cover"
                          />
                        )}
                        {item.videoUrl && <VideoEmbed src={item.videoUrl} title={item.title} provider={item.videoProvider} />}
                      </ContentViewTracker>
                      {pending && (
                        <p className="text-xs text-ink-soft">
                          Una parte de este contenido está en revisión — el texto definitivo todavía no está disponible.
                        </p>
                      )}
                    </Card>
                    {timelineItems && gerencia.length > 0 && (
                      <Card>
                        <LeadersBoard gerencia={gerencia} equipo={[]} equipoLabel={null} />
                      </Card>
                    )}
                  </Fragment>
                );
              })}
            </div>
          )}

          {stage.key === FASE_04_STAGE_KEY && equipoCount > 0 && (
            <TeamTeaser
              href="/onboarding/leaders#equipo"
              title={`Conocé a tu equipo${roleLabel ? ` de ${roleLabel}` : ""}`}
              description={`${equipoCount} ${equipoCount === 1 ? "persona" : "personas"} de tu área — podés volver cuando quieras.`}
            />
          )}

          {groups ? (
            <>
              <ProcessGroupNav groups={groups} active={Math.min(groupIndex, groups.length - 1)} onSelect={setGroupIndex} />
              <div className="flex flex-col gap-4">
                {activeGroup?.processes.map((process) => <ProcessCard key={process.id} process={process} />)}
              </div>
            </>
          ) : (
            stage.processes.map((process) => <ProcessCard key={process.id} process={process} />)
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Navegación secundaria por grupo (Bloque 3): pastillas en vez de tabs
 * tradicionales con contenido fijo — con 3-4 grupos por fase, envuelven
 * bien en mobile (flex-wrap) sin necesitar scroll horizontal ni acordeón.
 * Solo el grupo activo renderiza sus procesos, así nunca se ven todos a
 * la vez.
 */
function ProcessGroupNav({
  groups,
  active,
  onSelect,
}: {
  groups: GroupedProcesses<JourneyProcess>[];
  active: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div role="tablist" aria-label="Grupos de procesos de esta fase" className="flex flex-wrap gap-2">
      {groups.map((group, i) => {
        const totalSteps = group.processes.reduce((sum, p) => sum + p.steps.length, 0);
        const completedSteps = group.processes.reduce((sum, p) => sum + p.steps.filter((s) => s.completed).length, 0);
        const isActive = i === active;
        return (
          <button
            key={group.name}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(i)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
              isActive
                ? "border-brand bg-brand-tint text-brand-strong"
                : "border-line text-ink-soft hover:border-brand-soft hover:text-ink",
            )}
          >
            {group.name}
            {totalSteps > 0 && (
              <span className={cn("font-mono text-xs tabular-nums", isActive ? "text-brand" : "text-ink-soft/60")}>
                {completedSteps}/{totalSteps}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ProcessCard({ process }: { process: JourneyProcess }) {
  const pending = isPendingProcess(process.title);
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-display text-xl font-semibold text-ink">{process.title}</h3>
        {pending && <PendingBadge />}
      </div>
      {pending && (
        <p className="mt-1 text-xs text-ink-soft">Este proceso depende de una herramienta en revisión — el paso a paso puede cambiar.</p>
      )}
      {process.objective && <MarkdownContent className="mt-1">{process.objective}</MarkdownContent>}
      {process.context && <MarkdownContent className="mt-1">{process.context}</MarkdownContent>}
      {process.expectedResult && <MarkdownContent className="mt-1">{process.expectedResult}</MarkdownContent>}
      <ul className="mt-4 flex flex-col gap-4">
        {process.steps.map((step) => {
          const stepPending = !pending && isPendingStep(step.title);
          return (
            <li key={step.id} className="flex flex-col gap-2 border-b border-line pb-4 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex flex-wrap items-center gap-2 font-display text-base font-semibold text-ink">
                  {step.title}
                  {stepPending && <PendingBadge />}
                </span>
                <CompleteStepButton stepId={step.id} completed={step.completed} />
              </div>
              {step.description && <MarkdownContent>{step.description}</MarkdownContent>}
              {step.instruction && <MarkdownContent>{step.instruction}</MarkdownContent>}
              {step.videoUrl && <VideoEmbed src={step.videoUrl} title={step.title} provider={step.videoProvider} />}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
