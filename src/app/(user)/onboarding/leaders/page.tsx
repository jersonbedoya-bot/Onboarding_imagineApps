import { redirect } from "next/navigation";
import Link from "next/link";
import { requireActiveUser } from "@/server/auth/session";
import { resolveVisibleLeadersWithMedia } from "@/server/services/leader.service";
import { OnboardingTopbar } from "@/components/OnboardingTopbar";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { VideoEmbed } from "@/components/VideoEmbed";
import { UserMenu } from "@/components/UserMenu";

export default async function OnboardingLeadersPage() {
  let identity;
  try {
    identity = await requireActiveUser();
  } catch {
    redirect("/login");
  }

  if (!identity.functionalRoleId) {
    if (identity.platformRole === "ADMIN") {
      redirect("/admin/routes");
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

  const leaders = await resolveVisibleLeadersWithMedia(identity.tenantId, identity.functionalRoleId);

  return (
    <>
      <OnboardingTopbar />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-10">
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
          <div className="flex flex-col gap-6">
            {leaders.map((leader) => (
              <Card key={leader.id}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {leader.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={leader.photoUrl}
                      alt={leader.name}
                      className="h-28 w-28 flex-shrink-0 rounded-lg border border-line object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h2 className="font-display text-lg font-semibold text-ink">{leader.name}</h2>
                    <p className="text-sm text-ink-soft">{leader.title}</p>
                    {leader.description && <p className="mt-2 text-sm text-ink-soft">{leader.description}</p>}
                  </div>
                </div>
                {leader.videoUrl && (
                  <div className="mt-4">
                    <VideoEmbed src={leader.videoUrl} title={leader.name} />
                  </div>
                )}
              </Card>
            ))}
          </div>
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
