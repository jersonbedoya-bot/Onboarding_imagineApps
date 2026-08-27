import { assertValidTransition } from "@/lib/content-status";
import { NotFoundError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";
import * as routeRepository from "@/server/repositories/route.repository";
import * as auditRepository from "@/server/repositories/audit.repository";

const DEFAULT_ROUTE_NAME = "Ruta de onboarding";

/**
 * Creación perezosa: no hay un paso admin explícito "crear ruta" — se
 * autogenera en DRAFT la primera vez que hace falta (ver stage.service).
 * Atómica por el índice único {tenantId} (ver route.repository.getOrCreate).
 */
export async function ensureRoute(actingAdmin: RequestIdentity) {
  const { route, wasCreated } = await routeRepository.getOrCreate(actingAdmin.tenantId, DEFAULT_ROUTE_NAME);

  if (wasCreated) {
    await auditRepository.record({
      tenantId: actingAdmin.tenantId,
      userId: actingAdmin.userId,
      action: "ROUTE_CREATED",
      resource: "route",
      resourceId: route._id,
    });
  }

  return route;
}

export async function publishRoute(actingAdmin: RequestIdentity) {
  const route = await ensureRoute(actingAdmin);
  assertValidTransition(route.status, "PUBLISHED");

  const updated = await routeRepository.updateStatus(actingAdmin.tenantId, "PUBLISHED");
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "ROUTE_PUBLISHED",
    resource: "route",
    resourceId: updated._id,
  });

  return updated;
}

export async function archiveRoute(actingAdmin: RequestIdentity) {
  const route = await ensureRoute(actingAdmin);
  assertValidTransition(route.status, "ARCHIVED");

  const updated = await routeRepository.updateStatus(actingAdmin.tenantId, "ARCHIVED");
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "ROUTE_ARCHIVED",
    resource: "route",
    resourceId: updated._id,
  });

  return updated;
}

/** Reactivar: ARCHIVED -> DRAFT. Nunca directo a PUBLISHED — hay que publicarla de nuevo explícitamente. */
export async function reactivateRoute(actingAdmin: RequestIdentity) {
  const route = await ensureRoute(actingAdmin);
  assertValidTransition(route.status, "DRAFT");

  const updated = await routeRepository.updateStatus(actingAdmin.tenantId, "DRAFT");
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "ROUTE_REACTIVATED",
    resource: "route",
    resourceId: updated._id,
  });

  return updated;
}
