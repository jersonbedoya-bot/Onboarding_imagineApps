import { requireActiveUser } from "@/server/auth/session";
import { resolveJourney } from "@/server/services/progress.service";
import { resolveVisibleLeadersWithMedia } from "@/server/services/leader.service";
import { getRouteContent } from "@/server/services/route.service";
import { TerminalCelebration } from "./TerminalCelebration";
import { EmptyState } from "@/components/EmptyState";
import { UserMenu } from "@/components/UserMenu";
import { OnboardingJourney } from "./OnboardingJourney";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  // El layout de /onboarding ya garantiza sesión activa + rol funcional
  // antes de renderizar esta página (ver layout.tsx) — acá solo se vuelve
  // a pedir la identidad (cache() la dedupea, no hay segunda lectura) para
  // las consultas propias de esta pantalla.
  const identity = await requireActiveUser();

  const [journey, leaders, routeContent, { stage: requestedStageId }] = await Promise.all([
    resolveJourney(identity),
    resolveVisibleLeadersWithMedia(identity.tenantId, identity.functionalRoleId!),
    getRouteContent(identity.tenantId),
    searchParams,
  ]);

  // La gerencia (scope COMMON) ya no se avisa con un teaser-link arriba:
  // se muestra completa dentro de Fase 01 (ver OnboardingJourney), pegada
  // a "Hitos que nos Definieron" — el equipo de rol se avisa aparte dentro
  // de Fase 04, justo donde el usuario ya está leyendo sobre su propio rol.
  const gerencia = leaders.filter((leader) => leader.scope === "COMMON");
  const equipo = leaders.filter((leader) => leader.scope === "ROLE");

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

  // ?stage=<id>: sin UI propia hoy (ver comentario en OnboardingTopbar),
  // pero page.tsx lo sigue aceptando por si se reintroduce un salto directo
  // más adelante.
  const selectedStageId = requestedStageId ?? journey.currentStageId;

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-10 lg:px-12 xl:max-w-6xl xl:px-16">
      {journey.currentStageId === null ? (
        <FinishCard />
      ) : (
        <header className="mb-10 rounded-2xl border border-brand-soft bg-gradient-to-br from-brand-tint to-card px-8 py-10 sm:px-12 xl:py-14">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-strong">
            Tu recorrido
          </span>
          <h1 className="text-gradient-brand font-display text-4xl font-semibold leading-tight sm:text-5xl xl:text-6xl">{routeContent.headline}</h1>
          {routeContent.subtitle && <p className="mt-3 max-w-xl text-base text-ink-soft xl:text-lg">{routeContent.subtitle}</p>}
        </header>
      )}

      <OnboardingJourney
        stages={journey.stages}
        currentStageId={selectedStageId}
        equipoCount={equipo.length}
        roleLabel={journey.role?.label ?? null}
        gerencia={gerencia}
        blockedNextMessage={routeContent.blockedNextMessage}
        pendingContentMessage={routeContent.pendingContentMessage}
      />
    </main>
  );
}

function FinishCard() {
  return (
    <div className="mb-10 overflow-hidden rounded-xl bg-gradient-to-br from-brand-strong to-brand p-10 text-center text-white shadow-lg xl:p-16">
      <TerminalCelebration />
      <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-xl bg-card shadow-lg xl:h-20 xl:w-20">
        <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 xl:h-10 xl:w-10" aria-hidden="true">
          <path d="M12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.7 5.8 21 7 14 2 9.3 9 8.5z" fill="#fff" />
        </svg>
      </div>
      <h1 className="font-display text-3xl font-semibold sm:text-4xl xl:text-5xl">¡Completaste tu onboarding!</h1>
      <p className="mx-auto mt-3 max-w-md text-white/75 xl:text-lg">
        Recorriste todas las etapas. El contenido sigue disponible acá abajo como consulta.
      </p>
    </div>
  );
}
