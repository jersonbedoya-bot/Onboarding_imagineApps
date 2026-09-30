import type { ObjectId } from "mongodb";
import { assertValidTransition } from "@/lib/content-status";
import { NotFoundError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";
import * as routeRepository from "@/server/repositories/route.repository";
import * as auditRepository from "@/server/repositories/audit.repository";

import {
  DEFAULT_HEADLINE,
  DEFAULT_SUBTITLE,
  DEFAULT_BLOCKED_NEXT_MESSAGE,
  DEFAULT_PENDING_CONTENT_MESSAGE,
} from "@/lib/guide-message-defaults";

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

export type GuideMessage = { text: string; enabled: boolean };
export type RouteContent = {
  headline: string;
  subtitle: string;
  blockedNextMessage: GuideMessage;
  pendingContentMessage: GuideMessage;
};

/**
 * Lectura pública (cualquier usuario activo del tenant, no solo ADMIN) de
 * todo el contenido editable del recorrido: título/subtítulo del header de
 * /onboarding + los 2 mensajes de guía que antes vivían quemados en
 * OnboardingJourney.tsx. El default de texto solo aplica si el campo nunca
 * se configuró (`??`, no `||`): un admin que lo vacía a propósito desde
 * /admin/messages quiere que quede vacío, no que reaparezca el texto de
 * fábrica. `enabled` default `true` — mismo comportamiento de siempre,
 * antes de que existiera el toggle (el mensaje ya se mostraba siempre).
 */
export async function getRouteContent(tenantId: ObjectId): Promise<RouteContent> {
  const route = await routeRepository.findByTenant(tenantId);
  const blockedText = route?.blockedNextMessage ?? DEFAULT_BLOCKED_NEXT_MESSAGE;
  const pendingText = route?.pendingContentMessage ?? DEFAULT_PENDING_CONTENT_MESSAGE;
  // Un aviso sin texto cuenta como apagado: route.schema.ts permite guardar
  // "" solo con el aviso desactivado, pero un PATCH que solo reactive el
  // toggle dejaría un <p> vacío en el recorrido.
  return {
    headline: route?.headline ?? DEFAULT_HEADLINE,
    subtitle: route?.subtitle ?? DEFAULT_SUBTITLE,
    blockedNextMessage: {
      text: blockedText,
      enabled: (route?.blockedNextMessageEnabled ?? true) && blockedText.trim().length > 0,
    },
    pendingContentMessage: {
      text: pendingText,
      enabled: (route?.pendingContentMessageEnabled ?? true) && pendingText.trim().length > 0,
    },
  };
}

export async function updateRouteContent(
  actingAdmin: RequestIdentity,
  patch: {
    headline?: string | null;
    subtitle?: string | null;
    blockedNextMessage?: string | null;
    blockedNextMessageEnabled?: boolean | null;
    pendingContentMessage?: string | null;
    pendingContentMessageEnabled?: boolean | null;
  },
) {
  await ensureRoute(actingAdmin);
  const updated = await routeRepository.updateContent(actingAdmin.tenantId, patch);
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "ROUTE_UPDATED",
    resource: "route",
    resourceId: updated._id,
  });

  return updated;
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
