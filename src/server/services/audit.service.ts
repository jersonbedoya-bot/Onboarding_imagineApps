import type { ObjectId } from "mongodb";
import type { RequestIdentity } from "@/server/auth/session";
import type { AuditAction } from "@/server/repositories/audit.repository";
import * as auditRepository from "@/server/repositories/audit.repository";
import * as contentRepository from "@/server/repositories/content.repository";
import * as stageRepository from "@/server/repositories/stage.repository";
import * as leaderRepository from "@/server/repositories/leader.repository";
import * as processRepository from "@/server/repositories/process.repository";
import * as stepRepository from "@/server/repositories/step.repository";

const DEFAULT_PAGE_SIZE = 20;

type LabeledDoc = { title?: string; name?: string };

// Solo para eventos VIEJOS sin snapshot guardado (ver resolveResourceLabel).
// invitation/user/route/media no entran acá: o ya llevan buen metadata
// propio (invitación), o total no compensa la consulta extra.
const RESOURCE_FINDERS: Record<string, (tenantId: ObjectId, id: ObjectId) => Promise<LabeledDoc | null>> = {
  content_item: contentRepository.findById,
  stage: stageRepository.findById,
  leader: leaderRepository.findById,
  process: processRepository.findById,
  process_step: stepRepository.findById,
};

/**
 * "Recurso" legible para la tabla de /admin/audit: prioriza el snapshot
 * (`title`/`name`/`email`) guardado en `metadata` al momento del evento —
 * ver content/stage/leader/process/step .service.ts, que ahora lo llenan
 * en cada auditRepository.record. Antes de ese cambio, `metadata` venía
 * vacío para casi todo, así que cae a una consulta en vivo SOLO como
 * compatibilidad con los eventos que ya existían — eso deja de servir en
 * cuanto el recurso se borra, que es exactamente el caso que el snapshot
 * resuelve hacia adelante.
 */
async function resolveResourceLabel(
  tenantId: ObjectId,
  resource: string,
  resourceId: ObjectId,
  metadata: Record<string, unknown>,
): Promise<string | null> {
  if (typeof metadata.title === "string") return metadata.title;
  if (typeof metadata.name === "string") return metadata.name;
  if (typeof metadata.email === "string") return metadata.email;

  const finder = RESOURCE_FINDERS[resource];
  if (!finder) return null;
  const doc = await finder(tenantId, resourceId);
  return doc?.title ?? doc?.name ?? null;
}

/**
 * tenantId sale SIEMPRE de actingAdmin (requireAdmin en el route
 * handler) — un admin nunca puede pedir la auditoría de otro tenant, ni
 * pasándolo por query param.
 */
export async function listAuditLog(
  actingAdmin: RequestIdentity,
  filters: { userId?: ObjectId; action?: AuditAction; from?: Date; to?: Date },
  pagination: { page?: number; pageSize?: number },
) {
  const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize = pagination.pageSize && pagination.pageSize > 0 ? pagination.pageSize : DEFAULT_PAGE_SIZE;
  const { items, total } = await auditRepository.listByTenant(actingAdmin.tenantId, filters, { page, pageSize });

  const enrichedItems = await Promise.all(
    items.map(async (item) => ({
      ...item,
      resourceLabel: await resolveResourceLabel(actingAdmin.tenantId, item.resource, item.resourceId, item.metadata),
    })),
  );

  return { items: enrichedItems, total };
}
