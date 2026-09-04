import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { requireContentEditor } from "@/server/auth/session";
import { resolveJourneyPreview } from "@/server/services/progress.service";
import { resolveVisibleLeadersWithMedia } from "@/server/services/leader.service";
import { getRouteContent } from "@/server/services/route.service";
import * as roleRepository from "@/server/repositories/role.repository";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/Card";
import { LinkButton } from "@/components/Button";
import { OnboardingJourney } from "@/app/(user)/onboarding/OnboardingJourney";

/**
 * "Ver el onboarding sin cerrar sesión" — pedido explícito del usuario: al
 * editar contenido, antes había que salir del admin e iniciar sesión con
 * un usuario normal para ver cómo quedaba. Elegís qué rol funcional
 * previsualizar (el contenido difiere por rol) y se renderiza el mismo
 * OnboardingJourney real, en `previewMode` (solo lectura: oculta los
 * botones que persistirían progreso — ver ese prop).
 *
 * A propósito NO es una impersonación real: Admin/Editor nunca tienen
 * functionalRoleId (ver PLATFORM_ROLES), así que no hay ningún
 * `user_progress` propio al cual atribuirle "completado". Ver
 * resolveJourneyPreview (progress.service.ts): todo aparece desbloqueado,
 * nada aparece completado, y nada de lo que se vea acá se guarda.
 */
export default async function AdminPreviewPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  let identity;
  try {
    identity = await requireContentEditor();
  } catch {
    redirect("/login");
  }

  const [{ role: roleIdParam }, roles] = await Promise.all([searchParams, roleRepository.listByTenant(identity.tenantId)]);
  const selectedRole = roleIdParam && ObjectId.isValid(roleIdParam) ? (roles.find((role) => role._id.toString() === roleIdParam) ?? null) : null;

  if (!selectedRole) {
    return (
      <div>
        <PageHeader
          title="Vista previa del onboarding"
          description="Elegí qué rol funcional querés ver, tal como lo vería un Imaginer con ese rol — de solo lectura, no queda nada guardado."
        />
        {roles.length === 0 ? (
          <p className="text-sm text-ink-soft">Todavía no hay roles funcionales creados.</p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row">
            {roles.map((role) => (
              <Card key={role._id.toString()} className="flex flex-1 flex-col gap-3">
                <p className="font-display text-lg font-semibold text-ink">{role.label}</p>
                <LinkButton href={`/admin/preview?role=${role._id.toString()}`} className="self-start px-4 py-2 text-sm">
                  Ver como {role.label} →
                </LinkButton>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  const [journey, leaders, routeContent] = await Promise.all([
    resolveJourneyPreview(identity.tenantId, selectedRole._id),
    resolveVisibleLeadersWithMedia(identity.tenantId, selectedRole._id),
    getRouteContent(identity.tenantId),
  ]);
  const gerencia = leaders.filter((leader) => leader.scope === "COMMON");
  const equipo = leaders.filter((leader) => leader.scope === "ROLE");

  return (
    <div>
      <PageHeader
        title={`Vista previa · ${selectedRole.label}`}
        description="Solo lectura: nada de lo que veas acá queda guardado ni afecta a ningún usuario real."
        action={
          <LinkButton href="/admin/preview" variant="secondary" className="px-3 py-1.5 text-xs">
            Cambiar de rol
          </LinkButton>
        }
      />

      {journey.stages.length === 0 ? (
        <p className="text-sm text-ink-soft">Todavía no hay una ruta de onboarding publicada.</p>
      ) : (
        <OnboardingJourney
          stages={journey.stages}
          currentStageId={journey.stages[0].id}
          equipoCount={equipo.length}
          roleLabel={journey.role?.label ?? null}
          gerencia={gerencia}
          blockedNextMessage={routeContent.blockedNextMessage}
          pendingContentMessage={routeContent.pendingContentMessage}
          previewMode
        />
      )}
    </div>
  );
}
