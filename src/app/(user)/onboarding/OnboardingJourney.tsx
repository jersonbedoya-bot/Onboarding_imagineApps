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
import { CultureValuesGrid } from "@/components/CultureValuesGrid";
import { IconCardGrid } from "@/components/IconCardGrid";
import { QuizBlock } from "@/components/QuizBlock";
import { LeadersBoard } from "./leaders/LeadersBoard";
import type { LeaderCardData } from "./leaders/LeaderCard";
import { groupProcesses, FASE_04_STAGE_KEY, FASE_COMO_TRABAJAMOS_STAGE_KEY, contentItemSection, type GroupedProcesses } from "@/lib/phase-groups";
import { isPendingProcess, isPendingStep, isPendingContentItem } from "@/lib/pending-content";
import {
  splitFactGrid,
  factIcon,
  factBadgeIcon,
  splitValuesGrid,
  splitTimeline,
  splitSteps,
  stepNumberIcon,
  parseQuizQuestions,
} from "@/lib/content-display";
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
  equipo,
  blockedNextMessage,
  pendingContentMessage,
  previewMode = false,
}: {
  stages: JourneyStage[];
  currentStageId: string | null;
  equipoCount: number;
  roleLabel: string | null;
  gerencia: LeaderCardData[];
  // Solo se usa en previewMode (ver más abajo) — en uso real, "Conoce a tu
  // equipo" sigue siendo un link a /onboarding/leaders, que no necesita los
  // datos acá.
  equipo: LeaderCardData[];
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
   *
   * También cambia cómo se muestra "Conoce a tu equipo" (Fase 04): el link
   * normal a /onboarding/leaders vive bajo el layout de (user)/onboarding,
   * que redirige a /admin/modules apenas ve un identity sin functionalRoleId
   * (todo Admin/Editor) — un Admin/Editor haciendo clic ahí terminaba
   * expulsado de la vista previa de un salto. Acá se embebe el mismo
   * LeadersBoard en la propia card, igual que ya se hace con la gerencia.
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
  const quizItem = stage.items.find((item) => item.displayFormat === "QUIZ");
  const quizQuestions = quizItem?.body ? parseQuizQuestions(quizItem.body) : null;
  const [quizGateOpen, setQuizGateOpen] = useState(false);
  // Arranca en false y QuizBlock lo vuelve a poner en false apenas se monta
  // (answeredCount arranca en 0) — cada apertura del modal es un quiz
  // fresco, así que no hace falta resetear esto a mano al abrir/cerrar.
  const [quizAllAnswered, setQuizAllAnswered] = useState(false);
  // Quizzes ya respondidos una vez (por este usuario) — pedido explícito:
  // no volver a exigir responder si ya se pasó ese gate antes. Se semilla
  // con `item.viewed` de TODAS las etapas (no solo la actual) para que
  // "Módulo anterior" no vuelva a pedir un quiz ya hecho en esta misma
  // sesión de navegación; se actualiza también en memoria al pasar el gate
  // (ver advance) porque `stages` no se vuelve a pedir al servidor hasta
  // el próximo router.refresh()/reload.
  const [answeredQuizIds, setAnsweredQuizIds] = useState<Set<string>>(
    () =>
      new Set(
        stages.flatMap((s) => {
          const q = s.items.find((item) => item.displayFormat === "QUIZ");
          return q?.viewed ? [q.id] : [];
        }),
      ),
  );
  const quizAlreadyAnswered = quizItem ? answeredQuizIds.has(quizItem.id) : false;

  function advance() {
    setQuizGateOpen(false);
    if (quizItem && quizQuestions && !quizAlreadyAnswered) {
      // Marca el quiz como respondido — reusa el mismo endpoint de "visto
      // pasivo" que ya usa ContentViewTracker para contenido INFORMATIONAL
      // (el quiz es INFORMATIONAL, ver add-quiz-questions.ts): no hace
      // falta un endpoint nuevo. Best-effort (sin await): si falla, la
      // próxima carga completa del server vuelve a pedir el quiz — no es
      // catastrófico, mismo criterio que ContentViewTracker.
      setAnsweredQuizIds((prev) => new Set(prev).add(quizItem.id));
      fetch(`/api/progress/content/${quizItem.id}/view`, { method: "POST" }).catch(() => {});
    }
    if (nextStage) {
      setIndex(index + 1);
    } else if (previewMode) {
      // Preview (Admin/Editor, ver admin/preview/page.tsx): nunca hay
      // progreso real ("todo desbloqueado, nada completado"), así que este
      // branch solo se alcanza en el caso borde de una última etapa vacía
      // (readOnly). completado/page.tsx vive bajo el layout de
      // (user)/onboarding, que redirige a cualquiera sin functionalRoleId —
      // Admin/Editor nunca lo tienen, así que navegar ahí lo sacaría de la
      // preview en vez de mostrarle un cierre real. Se mantiene el refresh
      // in-place de siempre.
      router.refresh();
    } else {
      // Última etapa: acá se completó lo último que hacía falta (el botón
      // "Terminar Onboarding" solo aparece con stage.status === "COMPLETE",
      // y esa condición ya se escribió en Mongo por la acción que la
      // gatilló — MarkAsReadButton/CompleteProcessButton, cada una con su
      // propio refresh). Antes esto hacía un router.refresh() acá mismo: el
      // usuario reportó que "parece que no pasa nada" porque se quedaba
      // viendo la misma etapa, con el único indicio (FinishCard) arriba del
      // todo, fuera de la vista. Ahora navega a una pantalla de cierre
      // propia — ver completado/page.tsx, que vuelve a pedir el progreso
      // real al servidor (no hace falta refrescar antes).
      router.push("/onboarding/completado");
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
        equipo={equipo}
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
          <Button
            className="px-4 py-2 text-sm"
            onClick={() => (quizQuestions && !quizAlreadyAnswered ? setQuizGateOpen(true) : advance())}
          >
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

function StageSection({
  stage,
  index,
  total,
  isCurrent,
  equipoCount,
  roleLabel,
  gerencia,
  equipo,
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
  equipo: LeaderCardData[];
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
  // Acordeón por grupo (pedido explícito del usuario, ver ProcessCard):
  // como máximo una card abierta a la vez dentro del grupo activo — abrir
  // otra cierra la que estaba, y cambiar de pestaña (ver handleSelectGroup
  // más abajo) las cierra todas. null = ninguna abierta; el id vive acá
  // (no en cada ProcessCard) porque coordinar "solo una abierta" entre
  // hermanos necesita un único dueño del estado.
  const [openProcessId, setOpenProcessId] = useState<string | null>(null);
  function handleSelectGroup(index: number) {
    setGroupIndex(index);
    setOpenProcessId(null);
  }
  // Barra de progreso de la fase, en grupos/módulos en vez de pasos sueltos
  // (pedido explícito del usuario): esta fase no tiene content items, así
  // que stage.totalCompletable/completedCount (server, ver progress.
  // service.totalCompletableOf) cuentan PASOS — para el rol PDM eso es 137,
  // un número sin sentido para alguien que recién entra. Acá se recalcula
  // solo para mostrar, contando grupos en vez de pasos (7 para PDM, por
  // ejemplo) — el pill de cada grupo ya cuenta procesos (ver ProcessGroupNav),
  // así que esta barra queda como el nivel más agregado de los tres. No
  // toca stage.status/unlocked: el desbloqueo de la siguiente fase sigue
  // dependiendo del total real de pasos, sin cambios.
  const groupCompletion = groups
    ? {
        total: groups.length,
        completed: groups.filter((g) => {
          const withSteps = g.processes.filter((p) => p.steps.length > 0);
          return withSteps.length > 0 && withSteps.every((p) => p.steps.every((s) => s.completed));
        }).length,
      }
    : null;
  // El quiz ("Pon a Prueba lo que Aprendiste") nunca va en este listado: se
  // dispara en modal desde el botón "Siguiente módulo"/"Terminar Onboarding"
  // de OnboardingJourney, nunca como una card más acá abajo.
  const visibleItems = stage.items.filter((item) => item.displayFormat !== "QUIZ");

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
      </div>

      {/* readOnly ya lo dice el badge "Consulta disponible" de arriba — este
          párrafo repetía el mismo mensaje en prosa justo debajo, sentía
          redundante (ver feedback de usuario). */}
      {!stage.readOnly && (
        <div className="mb-6 max-w-xs xl:max-w-sm">
          <ProgressBar
            value={
              groupCompletion
                ? groupCompletion.total > 0
                  ? (groupCompletion.completed / groupCompletion.total) * 100
                  : 100
                : stage.totalCompletable > 0
                  ? (stage.completedCount / stage.totalCompletable) * 100
                  : 100
            }
            label={groupCompletion ? `${groupCompletion.completed}/${groupCompletion.total}` : `${stage.completedCount}/${stage.totalCompletable}`}
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
                // La gerencia (scope COMMON) se embebe justo después de los
                // hitos, como pidió el usuario ("origen y trayectoria... ahí
                // las cards de la gerencia"), reusando el mismo LeadersBoard
                // de /leaders — ver el `index === 0` puntual más abajo.
                //
                // `item.displayFormat` (ver content-display.ts) reemplaza el
                // mecanismo anterior de adivinar el layout por el título:
                // cada formato intenta parsear `body`, y si no calza cae a
                // MarkdownContent normal — nunca se rompe la vista.
                const factSplit = item.displayFormat === "FACT_GRID" && item.body ? splitFactGrid(item.body) : null;
                const valuesSplit = item.displayFormat === "VALUES_GRID" && item.body ? splitValuesGrid(item.body) : null;
                const timelineSplit = item.displayFormat === "TIMELINE" && item.body ? splitTimeline(item.body) : null;
                const stepsSplit = item.displayFormat === "STEPS" && item.body ? splitSteps(item.body) : null;
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
                        {factSplit ? (
                          <>
                            {factSplit.intro && <MarkdownContent>{factSplit.intro}</MarkdownContent>}
                            <IconCardGrid
                              items={factSplit.items.map((fact) => ({
                                icon: fact.badge ? factBadgeIcon(fact.badge) : factIcon(fact.title),
                                title: fact.title,
                                href: fact.href,
                                badge: fact.badge,
                                description: fact.description,
                              }))}
                            />
                            {factSplit.outro && <MarkdownContent className="mt-3">{factSplit.outro}</MarkdownContent>}
                          </>
                        ) : valuesSplit ? (
                          <>
                            {valuesSplit.intro && <MarkdownContent>{valuesSplit.intro}</MarkdownContent>}
                            <CultureValuesGrid values={valuesSplit.values} />
                          </>
                        ) : timelineSplit ? (
                          <>
                            {timelineSplit.intro && <MarkdownContent>{timelineSplit.intro}</MarkdownContent>}
                            <HistoryTimeline items={timelineSplit.items} />
                            {timelineSplit.outro && <MarkdownContent className="mt-3">{timelineSplit.outro}</MarkdownContent>}
                          </>
                        ) : stepsSplit ? (
                          <>
                            {stepsSplit.intro && <MarkdownContent>{stepsSplit.intro}</MarkdownContent>}
                            <IconCardGrid
                              items={stepsSplit.steps.map((description, stepIndex) => ({
                                icon: stepNumberIcon(stepIndex),
                                description,
                              }))}
                            />
                            {stepsSplit.outro && <MarkdownContent className="mt-3">{stepsSplit.outro}</MarkdownContent>}
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
                    {timelineSplit && gerencia.length > 0 && (
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
            previewMode ? (
              // El link normal (abajo) apunta a /onboarding/leaders, que vive
              // bajo el layout de (user)/onboarding — ese layout redirige a
              // /admin/modules apenas ve un identity sin functionalRoleId
              // (todo Admin/Editor, ver layout.tsx). Acá se embebe el mismo
              // LeadersBoard en la card en vez de linkear ahí, para no
              // expulsar a quien está usando /admin/preview.
              <Card>
                <LeadersBoard gerencia={[]} equipo={equipo} equipoLabel={roleLabel} variant="card" />
              </Card>
            ) : (
              <TeamTeaser
                href="/onboarding/leaders#equipo"
                title={`Conoce a tu equipo${roleLabel ? ` de ${roleLabel}` : ""}`}
                description={`${equipoCount} ${equipoCount === 1 ? "persona" : "personas"} de tu equipo — puedes volver cuando quieras.`}
              />
            )
          )}

          {groups ? (
            <>
              <ProcessGroupNav groups={groups} active={Math.min(groupIndex, groups.length - 1)} onSelect={handleSelectGroup} />
              <div className="flex flex-col gap-4">
                {activeGroup?.processes.map((process) => (
                  <ProcessCard
                    key={process.id}
                    process={process}
                    pendingContentMessage={pendingContentMessage}
                    previewMode={previewMode}
                    isOpen={openProcessId === process.id}
                    onToggle={() => setOpenProcessId((current) => (current === process.id ? null : process.id))}
                  />
                ))}
              </div>
            </>
          ) : (
            stage.processes.map((process) => (
              <ProcessCard key={process.id} process={process} pendingContentMessage={pendingContentMessage} previewMode={previewMode} />
            ))
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

function ProcessCard({
  process,
  pendingContentMessage,
  previewMode = false,
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
}: {
  process: JourneyProcess;
  pendingContentMessage: GuideMessage;
  previewMode?: boolean;
  /**
   * Modo "acordeón", controlado desde StageSection — para procesos
   * agrupados por pestaña (ver ProcessGroupNav), donde el usuario pidió que
   * como máximo una card quede abierta a la vez dentro del grupo activo, y
   * que cambiar de pestaña las cierre todas. Si no se pasan (lista plana,
   * fases sin agrupar), la card sigue manejando su propio estado como
   * siempre — cada una independiente de sus hermanas.
   */
  isOpen?: boolean;
  onToggle?: () => void;
}) {
  const pending = isPendingProcess(process.title);
  const hasSteps = process.steps.length > 0;
  const allStepsCompleted = hasSteps && process.steps.every((s) => s.completed);
  // Colapsado por defecto solo si ya está completo: lo pendiente (la razón
  // real de estar viendo este grupo) se ve entero desde el primer render;
  // lo ya hecho no vuelve a ocupar pantalla salvo que se reabra a propósito
  // — antes un grupo de 5 procesos con varios ya terminados obligaba a
  // scrollear todo su detalle igual (ver auditoría, P5). Ignorado en modo
  // acordeón: ahí el dueño del estado es StageSection, que arranca cada
  // grupo con ninguna card abierta (ver openProcessId).
  const [internalIsOpen, setInternalIsOpen] = useState(!allStepsCompleted);
  const isOpen = controlledIsOpen ?? internalIsOpen;
  const toggle = controlledOnToggle ?? (() => setInternalIsOpen((v) => !v));

  // Al abrir una card, llevar su inicio arriba del todo — pedido explícito
  // del usuario: sin esto, abrir "Kickoff con Cliente" mientras la vista
  // seguía scrolleada por haber leído "Prekickoff" dejaba el contenido
  // nuevo empezando fuera de pantalla, más abajo de donde mirás. Se
  // dispara solo en la transición cerrada->abierta (nunca al cerrar, ni en
  // el primer render de una card que ya nace abierta por defecto — ver
  // wasOpenRef) para no scrollear cuando el usuario no acaba de pedirlo.
  // scroll-mt-28 en el contenedor deja lugar para el topbar sticky de
  // /onboarding, que si no taparía el título recién scrolleado.
  const cardRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(isOpen);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      cardRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  return (
    <div ref={cardRef} className="scroll-mt-28">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <button type="button" onClick={toggle} aria-expanded={isOpen} className="group flex flex-1 items-start gap-2 text-left">
            <h3 className="font-display text-xl font-semibold text-ink xl:text-2xl">{process.title}</h3>
            <ChevronIcon open={isOpen} />
          </button>
          <span className="flex items-center gap-2">
            {pending && <PendingBadge />}
            {/* El check de "ya revisado" se queda arriba (permite ver de un
                vistazo qué procesos ya están hechos sin expandir cada uno,
                incluso colapsada) — el BOTÓN de acción se movió al final de
                la card, ver más abajo (feedback de usuario: pedía completar
                algo que todavía no habías leído). */}
            {hasSteps && allStepsCompleted && <CompletedCheck label="Revisado" />}
          </span>
        </div>
        {pending && pendingContentMessage.enabled && <p className="mt-1 text-xs text-ink-soft">{pendingContentMessage.text}</p>}
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
            {hasSteps && !allStepsCompleted && !previewMode && (
              // Alineado a la derecha: consistente con MarkAsReadButton (ya a
              // la derecha, arriba de cada contenido) y con el patrón usual de
              // "acción principal al final de la card, lado derecho".
              <div className="mt-2 flex justify-end">
                <CompleteProcessButton processId={process.id} />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
