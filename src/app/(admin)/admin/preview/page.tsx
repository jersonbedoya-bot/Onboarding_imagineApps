import { ObjectId } from "mongodb";
import Link from "next/link";
import { requireContentEditor } from "@/server/auth/session";
import { redirectForGuardError } from "@/server/auth/guard-redirect";
import { resolveJourneyPreview } from "@/server/services/progress.service";
import { resolveVisibleLeadersWithMedia } from "@/server/services/leader.service";
import { getRouteContent } from "@/server/services/route.service";
import * as roleRepository from "@/server/repositories/role.repository";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/Card";
import { LinkButton } from "@/components/Button";
import { RouteHeader } from "@/components/RouteHeader";
import { OnboardingJourney } from "@/app/(user)/onboarding/OnboardingJourney";

/**
 * "Ver el onboarding sin cerrar sesión" — pedido explícito del usuario: al
 * editar contenido, antes había que salir del admin e iniciar sesión con
 * un usuario normal para ver cómo quedaba. Se elige qué rol funcional
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
  } catch (error) {
    return redirectForGuardError(error);
  }

  const [{ role: roleIdParam }, roles] = await Promise.all([searchParams, roleRepository.listByTenant(identity.tenantId)]);
  const selectedRole = roleIdParam && ObjectId.isValid(roleIdParam) ? (roles.find((role) => role._id.toString() === roleIdParam) ?? null) : null;

  if (!selectedRole) {
    return (
      <div>
        <PageHeader
          title="Vista previa del onboarding"
          description="Elige qué rol funcional quieres ver, tal como lo vería un Imaginer con ese rol — de solo lectura, no queda nada guardado."
        />
        {roles.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Todavía no hay roles funcionales creados — crea uno en{" "}
            <Link href="/admin/roles" className="underline">
              Personas → Roles
            </Link>
            .
          </p>
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
        description="Solo lectura: nada de lo que veas aquí queda guardado ni afecta a ningún usuario real."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href="/admin/preview/completado" variant="secondary" className="px-3 py-1.5 text-xs">
              🎉 Ver pantalla final
            </LinkButton>
            <LinkButton href="/admin/preview" variant="secondary" className="px-3 py-1.5 text-xs">
              Cambiar de rol
            </LinkButton>
          </div>
        }
      />

      {journey.stages.length === 0 ? (
        <p className="text-sm text-ink-soft">Todavía no hay módulos publicados para este rol — publica el onboarding y al menos un módulo en Módulos.</p>
      ) : (
        <>
          {/* La vista previa siempre arranca en el primer módulo — mismo caso
              en que un Imaginer real ve la bienvenida (ver onboarding/page.tsx). */}
          <RouteHeader headline={routeContent.headline} subtitle={routeContent.subtitle} headingLevel="h2" />
          <OnboardingJourney
            stages={journey.stages}
            currentStageId={journey.stages[0].id}
            equipoCount={equipo.length}
            roleLabel={journey.role?.label ?? null}
            gerencia={gerencia}
            equipo={equipo}
            blockedNextMessage={routeContent.blockedNextMessage}
            pendingContentMessage={routeContent.pendingContentMessage}
            previewMode
          />
        </>
      )}
    </div>
  );
}
