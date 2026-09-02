import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { getRouteContent } from "@/server/services/route.service";
import { PageHeader } from "@/components/admin/PageHeader";
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
  } catch {
    redirect("/login");
  }

  const routeContent = await getRouteContent(identity.tenantId);

  return (
    <div>
      <PageHeader
        title="Mensajes de guía"
        description="El encabezado y los textos de orientación que ve cualquier usuario a lo largo de su recorrido."
      />
      <RouteContentForm
        headline={routeContent.headline}
        subtitle={routeContent.subtitle}
        blockedNextMessage={routeContent.blockedNextMessage}
        pendingContentMessage={routeContent.pendingContentMessage}
      />
    </div>
  );
}
