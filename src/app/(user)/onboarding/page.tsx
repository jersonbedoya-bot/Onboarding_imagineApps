import Link from "next/link";
import { requireActiveUser } from "@/server/auth/session";
import { resolveJourney } from "@/server/services/progress.service";
import { resolveVisibleLeadersWithMedia } from "@/server/services/leader.service";
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

  const [journey, leaders, { stage: requestedStageId }] = await Promise.all([
    resolveJourney(identity),
    resolveVisibleLeadersWithMedia(identity.tenantId, identity.functionalRoleId!),
    searchParams,
  ]);

  // Recursos no es parte del recorrido secuencial (ver Bloque 1) — el
  // sidebar ya lo excluye del stepper; acá también, para que "Módulo
  // anterior/siguiente" de OnboardingJourney nunca aterrice ahí.
  const stages = journey.stages.filter((stage) => stage.key !== "recursos");

  if (stages.length === 0) {
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

  // ?stage=<id> viene del sidebar (mapa del recorrido) — permite abrir
  // cualquier fase ya alcanzada sin depender de un state compartido entre
  // el layout (donde vive el sidebar) y esta página.
  const selectedStageId = requestedStageId ?? journey.currentStageId;

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-10 lg:px-12">
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

      <OnboardingJourney stages={stages} currentStageId={selectedStageId} />
    </main>
  );
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
