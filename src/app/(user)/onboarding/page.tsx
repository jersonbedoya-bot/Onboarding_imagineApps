import { redirect } from "next/navigation";
import Link from "next/link";
import { requireActiveUser } from "@/server/auth/session";
import { resolveJourney } from "@/server/services/progress.service";
import { resolveVisibleLeadersWithMedia } from "@/server/services/leader.service";
import { TerminalCelebration } from "./TerminalCelebration";
import { EmptyState } from "@/components/EmptyState";
import { UserMenu } from "@/components/UserMenu";
import { OnboardingTopbar } from "@/components/OnboardingTopbar";
import { OnboardingJourney } from "./OnboardingJourney";

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

        <OnboardingJourney stages={journey.stages} currentStageId={journey.currentStageId} />
      </main>
    </>
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
