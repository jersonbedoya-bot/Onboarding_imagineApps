import type { ObjectId } from "mongodb";
import { assertValidTransition } from "@/lib/content-status";
import { NotFoundError, ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";
import type { ContentScope } from "@/types/enums";
import * as processRepository from "@/server/repositories/process.repository";
import * as stageRepository from "@/server/repositories/stage.repository";
import * as routeRepository from "@/server/repositories/route.repository";
import * as auditRepository from "@/server/repositories/audit.repository";
import { assertRoleIdsBelongToTenant } from "@/server/services/scope-validation";

async function assertStageBelongsToTenant(tenantId: ObjectId, stageId: ObjectId) {
  const stage = await stageRepository.findById(tenantId, stageId);
  if (!stage) throw new ValidationError("stageId no corresponde a una etapa de este tenant.");
  return stage;
}

export async function listProcessesByStage(actingAdmin: RequestIdentity, stageId: ObjectId) {
  await assertStageBelongsToTenant(actingAdmin.tenantId, stageId);
  return processRepository.listByStage(actingAdmin.tenantId, stageId);
}

export async function createProcess(
  actingAdmin: RequestIdentity,
  input: {
    stageId: ObjectId;
    scope: ContentScope;
    roleIds: ObjectId[];
    title: string;
    objective: string;
    context: string;
    expectedResult: string;
    resources: string[];
    order?: number;
  },
) {
  await assertStageBelongsToTenant(actingAdmin.tenantId, input.stageId);
  if (input.scope === "ROLE") {
    await assertRoleIdsBelongToTenant(actingAdmin.tenantId, input.roleIds);
  }

  const order = input.order ?? (await processRepository.maxOrder(actingAdmin.tenantId, input.stageId)) + 1;

  const process = await processRepository.create({
    tenantId: actingAdmin.tenantId,
    stageId: input.stageId,
    scope: input.scope,
    roleIds: input.roleIds,
    title: input.title,
    objective: input.objective,
    context: input.context,
    expectedResult: input.expectedResult,
    resources: input.resources,
    order,
  });

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "PROCESS_CREATED",
    resource: "process",
    resourceId: process._id,
  });

  return process;
}

export async function updateProcess(
  actingAdmin: RequestIdentity,
  id: ObjectId,
  patch: {
    scope?: ContentScope;
    roleIds?: ObjectId[];
    title?: string;
    objective?: string;
    context?: string;
    expectedResult?: string;
    resources?: string[];
    order?: number;
  },
) {
  const current = await processRepository.findById(actingAdmin.tenantId, id);
  if (!current) throw new NotFoundError();

  const effectiveScope = patch.scope ?? current.scope;
  if (effectiveScope === "ROLE") {
    const effectiveRoleIds = patch.roleIds ?? current.roleIds;
    await assertRoleIdsBelongToTenant(actingAdmin.tenantId, effectiveRoleIds);
  }

  const updated = await processRepository.update(actingAdmin.tenantId, id, patch);
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "PROCESS_UPDATED",
    resource: "process",
    resourceId: updated._id,
  });

  return updated;
}

export async function publishProcess(actingAdmin: RequestIdentity, id: ObjectId) {
  const current = await processRepository.findById(actingAdmin.tenantId, id);
  if (!current) throw new NotFoundError();
  assertValidTransition(current.status, "PUBLISHED");

  const updated = await processRepository.updateStatus(actingAdmin.tenantId, id, "PUBLISHED");
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "PROCESS_PUBLISHED",
    resource: "process",
    resourceId: updated._id,
  });

  return updated;
}

export async function archiveProcess(actingAdmin: RequestIdentity, id: ObjectId) {
  const current = await processRepository.findById(actingAdmin.tenantId, id);
  if (!current) throw new NotFoundError();
  assertValidTransition(current.status, "ARCHIVED");

  const updated = await processRepository.updateStatus(actingAdmin.tenantId, id, "ARCHIVED");
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "PROCESS_ARCHIVED",
    resource: "process",
    resourceId: updated._id,
  });

  return updated;
}

/**
 * Cascada: ruta PUBLISHED -> etapa PUBLISHED -> proceso PUBLISHED
 * (COMMON o ROLE con este roleId) -> pasos PUBLISHED de ese proceso. Un
 * proceso archivado oculta sus pasos aunque los pasos en sí sigan
 * PUBLISHED — la visibilidad nunca sube desde el paso, solo baja desde
 * la ruta.
 */
export async function resolveVisibleProcesses(tenantId: ObjectId, roleId: ObjectId) {
  const route = await routeRepository.findByTenant(tenantId);
  if (!route || route.status !== "PUBLISHED") {
    return { route: null, processes: [] };
  }

  const stages = await stageRepository.listByRoute(tenantId, route._id, { status: "PUBLISHED" });
  if (stages.length === 0) {
    return { route, processes: [] };
  }

  const stageIds = stages.map((stage) => stage._id);
  const processes = await processRepository.findVisibleForRole(tenantId, stageIds, roleId);

  return { route, processes };
}
