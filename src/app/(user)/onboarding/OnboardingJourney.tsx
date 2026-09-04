"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { resolveJourney } from "@/server/services/progress.service";
import type { GuideMessage } from "@/server/services/route.service";
import { MarkAsReadButton } from "./MarkAsReadButton";
import { CompleteProcessButton } from "./CompleteProcessButton";
import { ContentViewTracker } from "./ContentViewTracker";
import { ProgressBar } from "@/components/ProgressBar";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { VideoEmbed } from "@/components/VideoEmbed";
import { MarkdownContent } from "@/components/MarkdownContent";
import { PendingBadge } from "@/components/PendingBadge";
import { TeamTeaser } from "@/components/TeamTeaser";
import { HistoryTimeline } from "@/components/HistoryTimeline";
import { TitleIcon } from "@/components/TitleIcon";
import { ProcessStepsTimeline } from "@/components/ProcessStepsTimeline";
import { ImpactProjectsGrid } from "@/components/ImpactProjectsGrid";
import { NonNegotiablesGrid } from "@/components/NonNegotiablesGrid";
import { CultureValuesGrid } from "@/components/CultureValuesGrid";
import { QuizBlock } from "@/components/QuizBlock";
import { LeadersBoard } from "./leaders/LeadersBoard";
import type { LeaderCardData } from "./leaders/LeaderCard";
import { groupProcesses, FASE_04_STAGE_KEY, FASE_COMO_TRABAJAMOS_STAGE_KEY, contentItemSection, type GroupedProcesses } from "@/lib/phase-groups";
import { isPendingProcess, isPendingStep, isPendingContentItem } from "@/lib/pending-content";
import {
  isHistoryTimelineContent,
  isImpactProjectsContent,
  isNonNegotiablesContent,
  isCultureValuesContent,
  isQuizContent,
  parseTimelineItems,
  parseImpactProjects,
  parseNonNegotiables,
  splitCultureValues,
  parseQuizQuestions,
} from "@/lib/institutional-content";
import { cn } from "@/lib/cn";

type Journey = Awaited<ReturnType<typeof resolveJourney>>;
type JourneyStage = Journey["stages"][number];
type JourneyProcess = JourneyStage["processes"][number];

// Duración del scroll-al-tope al cambiar de módulo — el `behavior: "smooth"`
// nativo (usado antes) no expone forma de ajustar su velocidad, y se sentía
// muy brusco. 900ms con ease-in-out se ve pausado sin sentirse lento.
const SCROLL_TO_TOP_DURATION_MS = 900;

function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function smoothScrollToTop(durationMs: number) {
  const startY = window.scrollY;
  if (startY === 0) return;
  const startTime = performance.now();

  function step(now: number) {
    const progress = Math.min((now - startTime) / durationMs, 1);
    window.scrollTo(0, startY * (1 - easeInOutQuad(progress)));
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/**
 * Indicador de solo lectura para un paso ya completado — sin acción
 * propia, ya que dentro de un proceso el completado se dispara una sola
 * vez para todos sus pasos (ver CompleteProcessButton). Nada se muestra
 * si todavía no está completado: no hay botón individual al que volver.
 */
function CompletedCheck({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  );
}

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
/** Ícono de reloj para el eyebrow "Paso X de Y" — inline para no sumar una dependencia por un solo glifo. */
function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function OnboardingJourney({
  stages,
  currentStageId,
  equipoCount,
  roleLabel,
  gerencia,
  blockedNextMessage,
  pendingContentMessage,
  previewMode = false,
}: {
  stages: JourneyStage[];
  currentStageId: string | null;
  equipoCount: number;
  roleLabel: string | null;
  gerencia: LeaderCardData[];
  // Antes quemados acá — ahora editables/desactivables desde
  // /admin/messages (ver route.service.getRouteContent).
  blockedNextMessage: GuideMessage;
  pendingContentMessage: GuideMessage;
  /**
   * true desde /admin/preview (Admin/Editor viendo el onboarding sin
   * cambiar de cuenta, ver ese page.tsx): oculta los botones que
   * persistirían progreso (MarkAsReadButton, ContentViewTracker,
   * CompleteProcessButton) — un Admin/Editor nunca tiene functionalRoleId,
   * así que esas escrituras fallarían igual server-side (requireRoleId);
   * mejor no mostrarlas que mostrar una acción que siempre falla.
   */
  previewMode?: boolean;
}) {
  const router = useRouter();
  const initialIndex = Math.max(
    0,
    stages.findIndex((s) => s.id === currentStageId),
  );
  const [index, setIndex] = useState(initialIndex);
  const stage = stages[index];
  const prevStage = stages[index - 1] ?? null;
  const nextStage = stages[index + 1] ?? null;

  // Quiz de la etapa ACTUAL (no la siguiente): "Pon a Prueba lo que
  // Aprendiste" cierra el módulo que estás dejando, no abre el que sigue.
  // Antes vivía como una card más al final del listado de items (ver
  // StageSection) — el usuario pidió que en vez de eso aparezca recién al
  // hacer clic en "Siguiente módulo" (o, en la última etapa, "Terminar
  // Onboarding") — un cierre con gracia antes de avanzar/terminar. Por eso
  // StageSection ya no lo muestra nunca inline: siempre hay una acción acá
  // abajo que lo dispara.
  const quizItem = stage.items.find((item) => isQuizContent(item.title));
  const quizQuestions = quizItem?.body ? parseQuizQuestions(quizItem.body) : null;
  const [quizGateOpen, setQuizGateOpen] = useState(false);
  // Arranca en false y QuizBlock lo vuelve a poner en false apenas se monta
  // (answeredCount arranca en 0) — cada apertura del modal es un quiz
  // fresco, así que no hace falta resetear esto a mano al abrir/cerrar.
  const [quizAllAnswered, setQuizAllAnswered] = useState(false);

  function advance() {
    setQuizGateOpen(false);
    if (nextStage) {
      setIndex(index + 1);
    } else {
      // Última etapa: no hay a dónde "avanzar" en este pager client-side —
      // se le pide al server que recalcule el progreso real (mismo patrón
      // que CompleteProcessButton/MarkAsReadButton). Si ya terminaste todo,
      // journey.currentStageId pasa a null y page.tsx muestra la FinishCard
      // arriba, sin perder acceso: el recorrido completo (este mismo
      // componente) sigue debajo para consulta — ver comentario en page.tsx.
      router.refresh();
    }
  }

  // Al cambiar de módulo (prev/next) se sube al tope de la página: sin esto
  // el cambio de contenido pasaba desapercibido si veías el final de la
  // etapa anterior (ver ProcessCard más abajo) — un simple swap in-place se
  // sentía como "ya pasé de largo" en vez de una transición real. Se salta
  // el primer render (montaje inicial, no un cambio de módulo) y respeta
  // prefers-reduced-motion (mismo criterio que .animate-stage-in en globals.css).
  //
  // El scroll nativo (`behavior: "smooth"`) no tiene forma de ajustarle la
  // velocidad — el usuario lo sintió muy brusco. Se reemplaza por una
  // animación propia con duración fija y ease-in-out, bastante más pausada
  // (ver SCROLL_TO_TOP_DURATION_MS).
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      window.scrollTo({ top: 0, behavior: "auto" });
    } else {
      smoothScrollToTop(SCROLL_TO_TOP_DURATION_MS);
    }
  }, [index]);

  return (
    <div>
      <StageSection
        stage={stage}
        index={index}
        total={stages.length}
        isCurrent={stage.id === currentStageId}
        equipoCount={equipoCount}
        roleLabel={roleLabel}
        gerencia={gerencia}
        pendingContentMessage={pendingContentMessage}
        previewMode={previewMode}
      />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 xl:mt-12 xl:pt-8">
        {prevStage ? (
          <Button variant="secondary" className="px-4 py-2 text-sm" onClick={() => setIndex(index - 1)}>
            ‹ Módulo anterior
          </Button>
        ) : (
          <span />
        )}
        {/* La última etapa no tiene "siguiente" al cual desbloquear — ahí el
            gate equivalente es que ELLA MISMA ya esté completa (mismo criterio
            de fondo: "terminaste lo que hacía falta acá"). */}
        {(nextStage ? nextStage.unlocked : stage.status === "COMPLETE") ? (
          <Button className="px-4 py-2 text-sm" onClick={() => (quizQuestions ? setQuizGateOpen(true) : advance())}>
            {nextStage ? "Siguiente módulo ›" : "🎉 Terminar Onboarding"}
          </Button>
        ) : (
          blockedNextMessage.enabled && <p className="text-xs text-ink-soft">{blockedNextMessage.text}</p>
        )}
      </div>

      {quizQuestions && (
        <Modal open={quizGateOpen} onClose={() => setQuizGateOpen(false)} title={quizItem?.title} maxWidthClassName="max-w-2xl">
          <QuizBlock questions={quizQuestions} onAllAnsweredChange={setQuizAllAnswered} />
          <Button className="mt-5 w-full justify-center" onClick={advance} disabled={!quizAllAnswered}>
            {nextStage ? "Continuar al siguiente módulo ›" : "🎉 Finalizar Onboarding"}
          </Button>
          {/* Pedido explícito del usuario: no se puede avanzar sin responder
              las N preguntas (no importa si acertaste, solo que respondiste
              todas) — antes el botón de acá abajo quedaba habilitado desde
              que se abría el modal. */}
          {!quizAllAnswered && <p className="mt-2 text-center text-xs text-ink-soft">Responde todas las preguntas para continuar.</p>}
        </Modal>
      )}
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
  return `${totalProcesses} ${totalProcesses === 1 ? "proceso" : "procesos"} organizados en ${groups.length} grupos por tema.`;
}

function StageSection({
  stage,
  index,
  total,
  isCurrent,
  equipoCount,
  roleLabel,
  gerencia,
  pendingContentMessage,
  previewMode = false,
}: {
  stage: JourneyStage;
  index: number;
  total: number;
  isCurrent: boolean;
  equipoCount: number;
  roleLabel: string | null;
  gerencia: LeaderCardData[];
  pendingContentMessage: GuideMessage;
  previewMode?: boolean;
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
  // El quiz ("Pon a Prueba lo que Aprendiste") nunca va en este listado: se
  // dispara en modal desde el botón "Siguiente módulo"/"Terminar Onboarding"
  // de OnboardingJourney, nunca como una card más acá abajo.
  const visibleItems = stage.items.filter((item) => !isQuizContent(item.title));

  return (
    <section>
      <div className="mb-8 xl:mb-10">
        {/* Mismo vocabulario ("Fase") que el indicador global del topbar —
            antes decía "Paso X de Y" acá mientras el topbar decía "Fase X de
            Y" para lo mismo (ver auditoría), y podían mostrar números
            distintos a la vez si se navega con ?stage= a una etapa que no es
            la actual del usuario. "Revisando" aclara esa diferencia en vez
            de dejar que dos cifras convivan sin explicación. */}
        <span className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-strong">
          <ClockIcon />
          {isCurrent ? `Fase ${index + 1} de ${total}` : `Revisando · Fase ${index + 1} de ${total}`}
        </span>
        {(isCurrent || !stage.unlocked || stage.status === "COMPLETE") && (
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            {isCurrent && <Badge variant="brand">Etapa actual</Badge>}
            {!stage.unlocked && <Badge variant="neutral">Bloqueada</Badge>}
            {stage.status === "COMPLETE" &&
              // readOnly (total===0, sin nada obligatorio) queda COMPLETE de
              // forma vacía apenas se entra, sin ninguna acción del usuario
              // — "Completa" en verde ahí se leía como un logro que no
              // existió (ver auditoría). Badge neutral en su lugar.
              (stage.readOnly ? (
                <Badge variant="neutral">Consulta disponible</Badge>
              ) : (
                <Badge variant="success">Completa</Badge>
              ))}
          </div>
        )}
        <h2 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl xl:text-5xl">
          <TitleIcon title={stage.title} size="text-3xl xl:text-4xl" />
        </h2>
        {summary && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{summary}</p>}
      </div>

      {stage.readOnly ? (
        <p className="mb-6 text-sm text-ink-soft">Contenido de consulta — no requiere acciones.</p>
      ) : (
        <div className="mb-6 max-w-xs xl:max-w-sm">
          <ProgressBar
            value={stage.totalCompletable > 0 ? (stage.completedCount / stage.totalCompletable) * 100 : 100}
            label={`${stage.completedCount}/${stage.totalCompletable}`}
          />
        </div>
      )}

      {!stage.unlocked ? null : (
        <div className="flex flex-col gap-4">
          {/* En la fase de Los Proyectos y Tu Rol en Ellos este mismo Card es,
              hoy, la introducción de rol (Bloque 4) — un content_item real
              (scope ROLE, ver content.service) titulado "Tu rol como <rol>",
              cargado por findVisibleForRole igual que cualquier otro
              contenido: cada usuario ve solo el suyo, sin lógica especial acá. */}
          {visibleItems.length > 0 && (
            <div className="flex flex-col gap-5">
              {visibleItems.map((item, itemIndex) => {
                const pending = isPendingContentItem(item.title);
                // Fase 01 (Bloque de historia): "Hitos que nos Definieron",
                // "Proyectos de Alto Impacto", "Principios No Negociables" y
                // los valores dentro de "Nuestra Visión" son
                // 4 content items fijos con layout propio (timeline / grilla
                // / mini-cards clickeables) en vez de texto plano — ver
                // institutional-content.ts. La gerencia (scope COMMON) se
                // embebe justo después de los hitos, como pidió el usuario
                // ("origen y trayectoria... ahí las cards de la gerencia"),
                // reusando el mismo LeadersBoard de /leaders.
                const isTimeline = isHistoryTimelineContent(item.title);
                const timelineItems = isTimeline && item.body ? parseTimelineItems(item.body) : null;
                const isProjects = isImpactProjectsContent(item.title);
                const projectItems = isProjects && item.body ? parseImpactProjects(item.body) : null;
                const isNonNegotiables = isNonNegotiablesContent(item.title);
                const nonNegotiableItems = isNonNegotiables && item.body ? parseNonNegotiables(item.body) : null;
                const isCultureValues = isCultureValuesContent(item.title);
                const cultureSplit = isCultureValues && item.body ? splitCultureValues(item.body) : null;
                // "Tu Día a Día en Imagine Apps" (ver phase-groups.ts) junta 6
                // cards de temas distintos (reglas/herramientas + políticas de
                // bienestar que antes vivían en la etapa Recursos, ya
                // eliminada) — un subtítulo de sección evita que se sientan
                // como una lista plana sin organización temática.
                const section = stage.key === FASE_COMO_TRABAJAMOS_STAGE_KEY ? contentItemSection(item.title) : null;
                const isNewSection = section !== null && (itemIndex === 0 || contentItemSection(visibleItems[itemIndex - 1].title) !== section);
                return (
                  <Fragment key={item.id}>
                    {isNewSection && (
                      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-brand first:mt-0">{section}</p>
                    )}
                    <Card
                      hover
                      className="animate-stage-in flex flex-col gap-3"
                      style={{ animationDelay: `${Math.min(itemIndex, 5) * 70}ms` }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <span className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-xl font-semibold leading-snug text-ink xl:text-2xl">{item.title}</p>
                          {pending && <PendingBadge />}
                        </span>
                        {!previewMode && item.requirement === "OBLIGATORY" && (
                          // Confeti chico solo en Fase 01 (index === 0, ver StageSection):
                          // el momento más "humano" del recorrido pide algo de
                          // celebración; el confeti grande queda para el final total.
                          <MarkAsReadButton contentItemId={item.id} completed={item.completed} celebrate={index === 0} />
                        )}
                      </div>
                      <ContentViewTracker
                        contentItemId={item.id}
                        initialViewed={item.viewed ?? false}
                        enabled={!previewMode && item.requirement !== "OBLIGATORY"}
                      >
                        {timelineItems ? (
                          <HistoryTimeline items={timelineItems} />
                        ) : projectItems ? (
                          <ImpactProjectsGrid projects={projectItems} />
                        ) : nonNegotiableItems ? (
                          <NonNegotiablesGrid items={nonNegotiableItems} />
                        ) : cultureSplit ? (
                          <>
                            {cultureSplit.intro && <MarkdownContent>{cultureSplit.intro}</MarkdownContent>}
                            <CultureValuesGrid values={cultureSplit.values} />
                          </>
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
                      {pending && pendingContentMessage.enabled && (
                        <p className="text-xs text-ink-soft">{pendingContentMessage.text}</p>
                      )}
                    </Card>
                    {timelineItems && gerencia.length > 0 && (
                      <Card>
                        <LeadersBoard gerencia={gerencia} equipo={[]} equipoLabel={null} variant="card" />
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
              title={`Conoce a tu equipo${roleLabel ? ` de ${roleLabel}` : ""}`}
              description={`${equipoCount} ${equipoCount === 1 ? "persona" : "personas"} de tu equipo — puedes volver cuando quieras.`}
            />
          )}

          {groups ? (
            <>
              <ProcessGroupNav groups={groups} active={Math.min(groupIndex, groups.length - 1)} onSelect={setGroupIndex} />
              <div className="flex flex-col gap-4">
                {activeGroup?.processes.map((process) => <ProcessCard key={process.id} process={process} previewMode={previewMode} />)}
              </div>
            </>
          ) : (
            stage.processes.map((process) => <ProcessCard key={process.id} process={process} previewMode={previewMode} />)
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
    <div role="tablist" aria-label="Grupos de procesos de esta fase" className="flex flex-wrap gap-2.5">
      {groups.map((group, i) => {
        // Se cuenta por proceso, no por paso — el completado ahora se
        // dispara de un tirón por proceso entero (CompleteProcessButton),
        // así que un conteo de pasos sueltos (16/16, 19/19...) ya no refleja
        // la acción real que hace el usuario. Un proceso sin pasos no entra
        // en el total: no hay nada que marcarle como completo.
        const withSteps = group.processes.filter((p) => p.steps.length > 0);
        const totalProcesses = withSteps.length;
        const completedProcesses = withSteps.filter((p) => p.steps.every((s) => s.completed)).length;
        const isActive = i === active;
        return (
          <button
            key={group.name}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(i)}
            className={cn(
              "flex min-w-[140px] flex-col items-start gap-1 rounded-xl border-2 px-4 py-2.5 text-left transition-colors",
              isActive ? "border-brand bg-brand-tint" : "border-line bg-paper hover:border-brand-soft",
            )}
          >
            <span className="flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
              <span aria-hidden="true">{group.icon}</span>
              {group.name}
            </span>
            {totalProcesses > 0 && (
              <span className={cn("font-mono text-xs tabular-nums", isActive ? "text-brand-strong" : "text-ink-soft/70")}>
                {completedProcesses}/{totalProcesses} procesos
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Mismo chevron que HistoryTimeline, para que "click para expandir" se vea igual en toda la app. */
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("mt-1.5 h-4 w-4 flex-none text-ink-soft transition-transform duration-200 group-hover:text-brand", open && "rotate-180")}
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProcessCard({ process, previewMode = false }: { process: JourneyProcess; previewMode?: boolean }) {
  const pending = isPendingProcess(process.title);
  const hasSteps = process.steps.length > 0;
  const allStepsCompleted = hasSteps && process.steps.every((s) => s.completed);
  // Colapsado por defecto solo si ya está completo: lo pendiente (la razón
  // real de estar viendo este grupo) se ve entero desde el primer render;
  // lo ya hecho no vuelve a ocupar pantalla salvo que se reabra a propósito
  // — antes un grupo de 5 procesos con varios ya terminados obligaba a
  // scrollear todo su detalle igual (ver auditoría, P5).
  const [isOpen, setIsOpen] = useState(!allStepsCompleted);
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <button type="button" onClick={() => setIsOpen((v) => !v)} aria-expanded={isOpen} className="group flex flex-1 items-start gap-2 text-left">
          <h3 className="font-display text-xl font-semibold text-ink xl:text-2xl">{process.title}</h3>
          <ChevronIcon open={isOpen} />
        </button>
        <span className="flex items-center gap-2">
          {pending && <PendingBadge />}
          {hasSteps &&
            (allStepsCompleted ? (
              <CompletedCheck label="Proceso completado" />
            ) : (
              !previewMode && <CompleteProcessButton processId={process.id} />
            ))}
        </span>
      </div>
      {pending && (
        <p className="mt-1 text-xs text-ink-soft">Este proceso depende de una herramienta en revisión — el paso a paso puede cambiar.</p>
      )}
      {process.objective && <MarkdownContent className="mt-1">{process.objective}</MarkdownContent>}
      {isOpen && (
        <>
          {process.context && <MarkdownContent className="mt-1">{process.context}</MarkdownContent>}
          {process.expectedResult && <MarkdownContent className="mt-1">{process.expectedResult}</MarkdownContent>}
          {process.resources.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-ink-soft">🧰 Herramientas:</span>
              {process.resources.map((resource) => (
                <span key={resource} className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-medium text-brand-strong">
                  {resource}
                </span>
              ))}
            </div>
          )}
          {hasSteps && (
            <ProcessStepsTimeline
              steps={process.steps}
              allCompleted={allStepsCompleted}
              isStepPending={(title) => !pending && isPendingStep(title)}
            />
          )}
        </>
      )}
    </Card>
  );
}
