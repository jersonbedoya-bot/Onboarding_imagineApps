import type { ObjectId } from "mongodb";
import { assertValidTransition } from "@/lib/content-status";
import { slugify } from "@/lib/slug";
import { NotFoundError, ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";
import * as stageRepository from "@/server/repositories/stage.repository";
import * as contentRepository from "@/server/repositories/content.repository";
import * as processRepository from "@/server/repositories/process.repository";
import * as auditRepository from "@/server/repositories/audit.repository";
import { ensureRoute } from "@/server/services/route.service";

async function assertDependsOnStageIsValid(
  tenantId: ObjectId,
  dependsOnStageId: ObjectId,
  selfId: ObjectId | null,
): Promise<void> {
  if (selfId && dependsOnStageId.equals(selfId)) {
    throw new ValidationError("Una etapa no puede depender de sí misma.");
  }
  const target = await stageRepository.findById(tenantId, dependsOnStageId);
  if (!target) {
    throw new ValidationError("dependsOnStageId no corresponde a una etapa de este tenant.");
  }
}

export async function listStages(actingAdmin: RequestIdentity) {
  const route = await ensureRoute(actingAdmin);
  return stageRepository.listByRoute(actingAdmin.tenantId, route._id);
}

export async function createStage(
  actingAdmin: RequestIdentity,
  input: { title: string; order?: number; dependsOnStageId?: ObjectId; isBlocking: boolean },
) {
  const route = await ensureRoute(actingAdmin);

  if (input.dependsOnStageId) {
    await assertDependsOnStageIsValid(actingAdmin.tenantId, input.dependsOnStageId, null);
  }

  const order = input.order ?? (await stageRepository.maxOrder(actingAdmin.tenantId, route._id)) + 1;

  const stage = await stageRepository.create({
    tenantId: actingAdmin.tenantId,
    routeId: route._id,
    key: slugify(input.title),
    title: input.title,
    order,
    dependsOnStageId: input.dependsOnStageId ?? null,
    isBlocking: input.isBlocking,
  });

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "STAGE_CREATED",
    resource: "stage",
    resourceId: stage._id,
  });

  return stage;
}

export async function updateStage(
  actingAdmin: RequestIdentity,
  stageId: ObjectId,
  patch: { title?: string; order?: number; dependsOnStageId?: ObjectId | null; isBlocking?: boolean },
) {
  const current = await stageRepository.findById(actingAdmin.tenantId, stageId);
  if (!current) throw new NotFoundError();

  if (patch.dependsOnStageId) {
    await assertDependsOnStageIsValid(actingAdmin.tenantId, patch.dependsOnStageId, stageId);
  }

  const updated = await stageRepository.update(actingAdmin.tenantId, stageId, patch);
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "STAGE_UPDATED",
    resource: "stage",
    resourceId: updated._id,
  });

  return updated;
}

export async function publishStage(actingAdmin: RequestIdentity, stageId: ObjectId) {
  const current = await stageRepository.findById(actingAdmin.tenantId, stageId);
  if (!current) throw new NotFoundError();
  assertValidTransition(current.status, "PUBLISHED");

  const updated = await stageRepository.updateStatus(actingAdmin.tenantId, stageId, "PUBLISHED");
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "STAGE_PUBLISHED",
    resource: "stage",
    resourceId: updated._id,
  });

  return updated;
}

export async function archiveStage(actingAdmin: RequestIdentity, stageId: ObjectId) {
  const current = await stageRepository.findById(actingAdmin.tenantId, stageId);
  if (!current) throw new NotFoundError();
  assertValidTransition(current.status, "ARCHIVED");

  const updated = await stageRepository.updateStatus(actingAdmin.tenantId, stageId, "ARCHIVED");
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "STAGE_ARCHIVED",
    resource: "stage",
    resourceId: updated._id,
  });

  return updated;
}

/**
 * Borrado permanente — ver comentario equivalente en content.service.ts.
 * Solo permitido sobre una etapa ya ARCHIVED, y solo si ya no le quedan
 * content items ni procesos (de ningún status): una etapa es "hoja" en
 * cuanto a cascada de borrado (no se implementó borrado en cascada), así
 * que primero hay que borrar cada hijo individualmente.
 */
export async function deleteStage(actingAdmin: RequestIdentity, stageId: ObjectId): Promise<void> {
  const current = await stageRepository.findById(actingAdmin.tenantId, stageId);
  if (!current) throw new NotFoundError();
  if (current.status !== "ARCHIVED") {
    throw new ValidationError("Solo se puede borrar un módulo que ya esté archivado.");
  }

  const remainingContent = await contentRepository.listByStage(actingAdmin.tenantId, stageId);
  if (remainingContent.length > 0) {
    throw new ValidationError("Este módulo todavía tiene contenido — borralo primero antes de borrar el módulo.");
  }

  const remainingProcesses = await processRepository.listByStage(actingAdmin.tenantId, stageId);
  if (remainingProcesses.length > 0) {
    throw new ValidationError("Este módulo todavía tiene procesos — borralos primero antes de borrar el módulo.");
  }

  const deleted = await stageRepository.remove(actingAdmin.tenantId, stageId);
  if (!deleted) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "STAGE_DELETED",
    resource: "stage",
    resourceId: stageId,
  });
}

/** Reactivar: ARCHIVED -> DRAFT. Nunca directo a PUBLISHED — hay que publicarla de nuevo explícitamente. */
export async function reactivateStage(actingAdmin: RequestIdentity, stageId: ObjectId) {
  const current = await stageRepository.findById(actingAdmin.tenantId, stageId);
  if (!current) throw new NotFoundError();
  assertValidTransition(current.status, "DRAFT");

  const updated = await stageRepository.updateStatus(actingAdmin.tenantId, stageId, "DRAFT");
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "STAGE_REACTIVATED",
    resource: "stage",
    resourceId: updated._id,
  });

  return updated;
}
