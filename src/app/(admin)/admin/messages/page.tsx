import { requireAdmin } from "@/server/auth/session";
import { redirectForGuardError } from "@/server/auth/guard-redirect";
import { getRouteContent } from "@/server/services/route.service";
import { pendingContentSummary } from "@/lib/pending-content";
import { PageHeader } from "@/components/admin/PageHeader";
import { LinkButton } from "@/components/Button";
import { RouteContentForm } from "@/components/admin/RouteContentForm";

/**
 * Sección propia para el contenido editorial del recorrido (título/subtítulo
 * del header + mensajes de guía) — antes el título/subtítulo vivía como un
 * Card suelto arriba de /admin/modules, que es la pantalla de la estructura
 * de módulos, no de sus textos de acompañamiento. Separarlo evita que
 * "Módulos" mezcle dos responsabilidades distintas.
 */
export default async function AdminMessagesPage() {
  let identity;
  try {
    identity = await requireAdmin();
  } catch (error) {
    return redirectForGuardError(error);
  }

  const routeContent = await getRouteContent(identity.tenantId);

  return (
    <div>
      <PageHeader
        title="Mensajes de guía"
        description="Los textos que acompañan a cada persona en su recorrido: la bienvenida y dos avisos que aparecen solos según la situación."
        action={
          <LinkButton href="/admin/preview" variant="secondary" className="px-4 py-2 text-sm">
            👁️ Ver en la vista previa
          </LinkButton>
        }
      />
      <RouteContentForm
        headline={routeContent.headline}
        subtitle={routeContent.subtitle}
        blockedNextMessage={routeContent.blockedNextMessage}
        pendingContentMessage={routeContent.pendingContentMessage}
        pendingSummary={pendingContentSummary()}
      />
    </div>
  );
}
