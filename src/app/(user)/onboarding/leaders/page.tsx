import { redirect } from "next/navigation";
import Link from "next/link";
import { requireActiveUser } from "@/server/auth/session";
import { resolveVisibleLeadersWithMedia } from "@/server/services/leader.service";
import * as roleRepository from "@/server/repositories/role.repository";
import { OnboardingTopbar } from "@/components/OnboardingTopbar";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { UserMenu } from "@/components/UserMenu";
import { LeadersBoard } from "./LeadersBoard";

export default async function OnboardingLeadersPage() {
  let identity;
  try {
    identity = await requireActiveUser();
  } catch {
    redirect("/login");
  }

  if (!identity.functionalRoleId) {
    if (identity.platformRole === "ADMIN") {
      redirect("/admin/modules");
    }
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-6">
        <EmptyState
          title="No tenés un rol funcional asignado"
          description="Pedile a un administrador que te asigne un rol para poder ver tu equipo."
        />
        <UserMenu />
      </main>
    );
  }

  const [leaders, role] = await Promise.all([
    resolveVisibleLeadersWithMedia(identity.tenantId, identity.functionalRoleId),
    roleRepository.findById(identity.tenantId, identity.functionalRoleId),
  ]);
  const gerencia = leaders.filter((leader) => leader.scope === "COMMON");
  const equipo = leaders.filter((leader) => leader.scope === "ROLE");

  return (
    <>
      <OnboardingTopbar />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-10">
        <header className="mb-10 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-soft bg-brand-tint px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand">
            Nuestro equipo
          </span>
          <h1 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">Conocé a tus líderes</h1>
          <p className="mx-auto mt-3 max-w-md text-ink-soft">Podés volver a esta página cuando quieras desde el menú de arriba.</p>
        </header>

        {leaders.length === 0 ? (
          <EmptyState
            title="Todavía no hay líderes publicados"
            description="Cuando tu organización los publique, los vas a ver acá."
          />
        ) : (
          <LeadersBoard gerencia={gerencia} equipo={equipo} equipoLabel={role?.label ?? null} />
        )}

        <div className="mt-10 text-center">
          <Link href="/onboarding">
            <Button variant="secondary">Volver a mi recorrido</Button>
          </Link>
        </div>
      </main>
    </>
  );
}
