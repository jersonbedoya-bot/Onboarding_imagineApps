import type { ObjectId } from "mongodb";
import { assertValidTransition } from "@/lib/content-status";
import { slugify } from "@/lib/slug";
import { NotFoundError, ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";
import * as stageRepository from "@/server/repositories/stage.repository";
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
