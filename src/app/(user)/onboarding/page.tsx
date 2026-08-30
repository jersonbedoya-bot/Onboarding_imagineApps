import { redirect } from "next/navigation";
import Link from "next/link";
import { requireActiveUser } from "@/server/auth/session";
import { resolveJourney } from "@/server/services/progress.service";
import { resolveVisibleLeadersWithMedia } from "@/server/services/leader.service";
import { CompleteStepButton } from "./CompleteStepButton";
import { MarkAsReadButton } from "./MarkAsReadButton";
import { ContentViewTracker } from "./ContentViewTracker";
import { TerminalCelebration } from "./TerminalCelebration";
import { ProgressBar } from "@/components/ProgressBar";
import { StepIndicator, type StepStatus } from "@/components/StepIndicator";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { UserMenu } from "@/components/UserMenu";
import { OnboardingTopbar } from "@/components/OnboardingTopbar";
import { VideoEmbed } from "@/components/VideoEmbed";
import { MarkdownContent } from "@/components/MarkdownContent";
import { LinkButton } from "@/components/Button";

type Journey = Awaited<ReturnType<typeof resolveJourney>>;
type JourneyStage = Journey["stages"][number];

export default async function OnboardingPage() {
  let identity;
  try {
    identity = await requireActiveUser();
  } catch {
    redirect("/login");
  }

  // resolveJourney (progress.service) exige functionalRoleId y lo valida
  // con un ValidationError — correcto para el service, pero acá arriba
  // necesitamos manejarlo antes de llamarlo, no dejarlo reventar sin
  // capturar. Un ADMIN nunca tiene rol funcional por diseño (ver
  // RequestIdentity): lo mandamos a su landing real en vez de mostrarle
  // un mensaje sobre algo que no le aplica. Un USER sin rol no debería
  // poder existir dado el flujo de invitación actual (el rol se copia
  // siempre de la invitación), pero si pasara, no hay a dónde
  // redirigirlo — se le explica la situación en vez de crashear.
  if (!identity.functionalRoleId) {
    if (identity.platformRole === "ADMIN") {
      redirect("/admin/modules");
    }
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-6">
        <EmptyState
          title="No tenés un rol funcional asignado"
          description="Pedile a un administrador que te asigne un rol para poder ver tu recorrido de onboarding."
        />
        <UserMenu />
      </main>
    );
  }

  const [journey, leaders] = await Promise.all([
    resolveJourney(identity),
    resolveVisibleLeadersWithMedia(identity.tenantId, identity.functionalRoleId),
  ]);

  if (journey.stages.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-6">
        <EmptyState
          title="Todavía no hay una ruta de onboarding publicada"
          description="Cuando tu organización publique el recorrido, vas a verlo acá."
        />
        <UserMenu />
      </main>
    );
  }

  const completedStages = journey.stages.filter((stage) => stage.status === "COMPLETE").length;
  const totalStages = journey.stages.length;

  return (
    <>
      <OnboardingTopbar progress={{ completed: completedStages, total: totalStages }} />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-10">
        {leaders.length > 0 && <TeamTeaser count={leaders.length} />}
        {journey.currentStageId === null ? (
          <FinishCard />
        ) : (
          <header className="mb-10 text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-soft bg-brand-tint px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand">
              Tu recorrido
            </span>
            <h1 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">Vamos paso a paso</h1>
            <p className="mx-auto mt-3 max-w-md text-ink-soft">
              Recorré cada etapa, marcá lo obligatorio como leído y completá los pasos de tu rol.
            </p>
          </header>
        )}

        <nav id="stages-nav" aria-label="Etapas del recorrido" className="mb-10 scroll-mt-24 rounded-lg border border-line bg-card p-2 shadow-sm">
          {journey.stages.map((stage, index) => {
            const indicator = (
              <StepIndicator
                status={stageStatus(stage, journey.currentStageId)}
                label={stage.title}
                index={index + 1}
                trailing={!stage.unlocked ? <Badge variant="neutral">Bloqueada</Badge> : undefined}
              />
            );
            // Solo las etapas desbloqueadas tienen contenido más abajo — para
            // las bloqueadas, el salto quedaría en un header vacío, así que
            // no se ofrece como link.
            return stage.unlocked ? (
              <a key={stage.id} href={`#${stage.id}`}>
                {indicator}
              </a>
            ) : (
              <div key={stage.id}>{indicator}</div>
            );
          })}
        </nav>

        <div className="flex flex-col gap-10">
          {journey.stages.map((stage, index) => (
            <StageSection
              key={stage.id}
              stage={stage}
              index={index}
              isCurrent={stage.id === journey.currentStageId}
              prevStage={journey.stages[index - 1] ?? null}
              nextStage={journey.stages[index + 1] ?? null}
            />
          ))}
        </div>
      </main>
    </>
  );
}

function stageStatus(stage: JourneyStage, currentStageId: string | null): StepStatus {
  if (!stage.unlocked) return "locked";
  if (stage.status === "COMPLETE") return "complete";
  if (stage.id === currentStageId) return "current";
  return "pending";
}

function TeamTeaser({ count }: { count: number }) {
  return (
    <Link
      href="/onboarding/leaders"
      className="mb-8 flex items-center justify-between gap-4 rounded-lg border border-brand-soft bg-brand-tint px-5 py-4 transition-colors hover:border-brand"
    >
      <div>
        <p className="text-sm font-semibold text-ink">Conocé a tu equipo antes de empezar</p>
        <p className="text-xs text-ink-soft">
          {count} {count === 1 ? "líder" : "líderes"} de tu proceso — podés volver a esta página cuando quieras.
        </p>
      </div>
      <span className="flex-shrink-0 text-sm font-semibold text-brand-strong">Ver equipo →</span>
    </Link>
  );
}

function FinishCard() {
  return (
    <div className="mb-10 overflow-hidden rounded-xl bg-gradient-to-br from-ink to-[#2d2622] p-10 text-center text-white shadow-lg">
      <TerminalCelebration />
      <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-xl bg-brand shadow-lg">
        <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" aria-hidden="true">
          <path d="M12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.7 5.8 21 7 14 2 9.3 9 8.5z" fill="#fff" />
        </svg>
      </div>
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">¡Completaste tu onboarding!</h1>
      <p className="mx-auto mt-3 max-w-md text-white/75">
        Recorriste todas las etapas. El contenido sigue disponible acá abajo como consulta.
      </p>
    </div>
  );
}

function StageSection({
  stage,
  index,
  isCurrent,
  prevStage,
  nextStage,
}: {
  stage: JourneyStage;
  index: number;
  isCurrent: boolean;
  prevStage: JourneyStage | null;
  nextStage: JourneyStage | null;
}) {
  return (
    <section id={stage.id} className="scroll-mt-24 border-t border-line pt-10 first:border-0 first:pt-0">
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
                      {item.videoUrl && <VideoEmbed src={item.videoUrl} title={item.title} />}
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
                    {step.videoUrl && <VideoEmbed src={step.videoUrl} title={step.title} />}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {stage.unlocked && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          {prevStage ? (
            <LinkButton href={`#${prevStage.id}`} variant="secondary" className="px-4 py-2 text-sm">
              ← {prevStage.title}
            </LinkButton>
          ) : (
            <span />
          )}
          <LinkButton href="#stages-nav" variant="ghost" className="px-4 py-2 text-sm">
            ↑ Ver todas las etapas
          </LinkButton>
          {nextStage ? (
            <LinkButton href={`#${nextStage.id}`} variant="secondary" className="px-4 py-2 text-sm">
              {nextStage.title} →
            </LinkButton>
          ) : (
            <span />
          )}
        </div>
      )}
    </section>
  );
}
