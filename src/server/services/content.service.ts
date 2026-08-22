import type { ObjectId } from "mongodb";
import { assertValidTransition } from "@/lib/content-status";
import { NotFoundError, ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";
import type { ContentItemType, ContentRequirement, ContentScope } from "@/types/enums";
import * as contentRepository from "@/server/repositories/content.repository";
import * as stageRepository from "@/server/repositories/stage.repository";
import * as roleRepository from "@/server/repositories/role.repository";
import * as routeRepository from "@/server/repositories/route.repository";
import * as auditRepository from "@/server/repositories/audit.repository";

async function assertStageBelongsToTenant(tenantId: ObjectId, stageId: ObjectId) {
  const stage = await stageRepository.findById(tenantId, stageId);
  if (!stage) throw new ValidationError("stageId no corresponde a una etapa de este tenant.");
  return stage;
}

async function assertRoleIdsBelongToTenant(tenantId: ObjectId, roleIds: ObjectId[]) {
  if (roleIds.length === 0) {
    throw new ValidationError("Un content_item con scope ROLE necesita al menos un roleId.");
  }
  const roles = await Promise.all(roleIds.map((roleId) => roleRepository.findById(tenantId, roleId)));
  if (roles.some((role) => !role)) {
    throw new ValidationError("Alguno de los roleIds no corresponde a un rol de este tenant.");
  }
}

export async function listContentByStage(actingAdmin: RequestIdentity, stageId: ObjectId) {
  await assertStageBelongsToTenant(actingAdmin.tenantId, stageId);
  return contentRepository.listByStage(actingAdmin.tenantId, stageId);
}

export async function createContentItem(
  actingAdmin: RequestIdentity,
  input: {
    stageId: ObjectId;
    type: ContentItemType;
    scope: ContentScope;
    roleIds: ObjectId[];
    title: string;
    body: string;
    requirement: ContentRequirement | null;
    order?: number;
  },
) {
  await assertStageBelongsToTenant(actingAdmin.tenantId, input.stageId);
  if (input.scope === "ROLE") {
    await assertRoleIdsBelongToTenant(actingAdmin.tenantId, input.roleIds);
  }

  const order = input.order ?? (await contentRepository.maxOrder(actingAdmin.tenantId, input.stageId)) + 1;

  const item = await contentRepository.create({
    tenantId: actingAdmin.tenantId,
    stageId: input.stageId,
    type: input.type,
    scope: input.scope,
    roleIds: input.roleIds,
    title: input.title,
    body: input.body,
    requirement: input.requirement,
    order,
  });

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "CONTENT_CREATED",
    resource: "content_item",
    resourceId: item._id,
  });

  return item;
}

export async function updateContentItem(
  actingAdmin: RequestIdentity,
  id: ObjectId,
  patch: {
    type?: ContentItemType;
    scope?: ContentScope;
    roleIds?: ObjectId[];
    title?: string;
    body?: string;
    requirement?: ContentRequirement | null;
    order?: number;
  },
) {
  const current = await contentRepository.findById(actingAdmin.tenantId, id);
  if (!current) throw new NotFoundError();

  const effectiveScope = patch.scope ?? current.scope;
  if (effectiveScope === "ROLE") {
    const effectiveRoleIds = patch.roleIds ?? current.roleIds;
    await assertRoleIdsBelongToTenant(actingAdmin.tenantId, effectiveRoleIds);
  }

  // Editar contenido PUBLISHED está permitido explícitamente (con audit).
  const updated = await contentRepository.update(actingAdmin.tenantId, id, patch);
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "CONTENT_UPDATED",
    resource: "content_item",
    resourceId: updated._id,
  });

  return updated;
}

export async function publishContentItem(actingAdmin: RequestIdentity, id: ObjectId) {
  const current = await contentRepository.findById(actingAdmin.tenantId, id);
  if (!current) throw new NotFoundError();
  assertValidTransition(current.status, "PUBLISHED");

  const updated = await contentRepository.updateStatus(actingAdmin.tenantId, id, "PUBLISHED");
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "CONTENT_PUBLISHED",
    resource: "content_item",
    resourceId: updated._id,
  });

  return updated;
}

export async function archiveContentItem(actingAdmin: RequestIdentity, id: ObjectId) {
  const current = await contentRepository.findById(actingAdmin.tenantId, id);
  if (!current) throw new NotFoundError();
  assertValidTransition(current.status, "ARCHIVED");

  const updated = await contentRepository.updateStatus(actingAdmin.tenantId, id, "ARCHIVED");
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "CONTENT_ARCHIVED",
    resource: "content_item",
    resourceId: updated._id,
  });

  return updated;
}

/**
 * Resolución de visibilidad: ruta PUBLISHED -> etapas PUBLISHED -> content
 * items PUBLISHED que sean COMMON o ROLE con este roleId. Cascada completa:
 * si la ruta o la etapa no están publicadas, su contenido no aparece aunque
 * el content_item en sí esté PUBLISHED.
 */
export async function resolveVisibleContent(tenantId: ObjectId, roleId: ObjectId) {
  const route = await routeRepository.findByTenant(tenantId);
  if (!route || route.status !== "PUBLISHED") {
    return { route: null, stages: [] };
  }

  const stages = await stageRepository.listByRoute(tenantId, route._id, { status: "PUBLISHED" });
  if (stages.length === 0) {
    return { route, stages: [] };
  }

  const stageIds = stages.map((stage) => stage._id);
  const items = await contentRepository.findVisibleForRole(tenantId, stageIds, roleId);

  const itemsByStage = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.stageId.toString();
    const bucket = itemsByStage.get(key) ?? [];
    bucket.push(item);
    itemsByStage.set(key, bucket);
  }

  return {
    route,
    stages: stages.map((stage) => ({
      stage,
      items: itemsByStage.get(stage._id.toString()) ?? [],
    })),
  };
}
