import type { ObjectId } from "mongodb";
import { assertValidTransition } from "@/lib/content-status";
import { normalizeVideoUrl } from "@/lib/video-url";
import { diffFields } from "@/lib/audit-diff";
import { NotFoundError, ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";
import type { VideoProvider } from "@/types/enums";
import * as stepRepository from "@/server/repositories/step.repository";
import * as processRepository from "@/server/repositories/process.repository";
import * as auditRepository from "@/server/repositories/audit.repository";
import { resolveVisibleProcesses } from "@/server/services/process.service";

function resolveVideo(rawVideoUrl: string | null | undefined): { videoUrl: string | null; videoProvider: VideoProvider | null } {
  if (!rawVideoUrl) return { videoUrl: null, videoProvider: null };
  const { provider, embedUrl } = normalizeVideoUrl(rawVideoUrl);
  return { videoUrl: embedUrl, videoProvider: provider };
}

async function assertProcessBelongsToTenant(tenantId: ObjectId, processId: ObjectId) {
  const process = await processRepository.findById(tenantId, processId);
  if (!process) throw new ValidationError("processId no corresponde a un proceso de este tenant.");
  return process;
}

export async function listStepsByProcess(actingAdmin: RequestIdentity, processId: ObjectId) {
  await assertProcessBelongsToTenant(actingAdmin.tenantId, processId);
  return stepRepository.listByProcess(actingAdmin.tenantId, processId);
}

export async function createStep(
  actingAdmin: RequestIdentity,
  input: {
    processId: ObjectId;
    title: string;
    description: string;
    instruction: string;
    resources: string[];
    videoUrl?: string;
    links: string[];
    completionCriteria: string;
    order?: number;
  },
) {
  await assertProcessBelongsToTenant(actingAdmin.tenantId, input.processId);
  const { videoUrl, videoProvider } = resolveVideo(input.videoUrl);

  const order = input.order ?? (await stepRepository.maxOrder(actingAdmin.tenantId, input.processId)) + 1;

  const step = await stepRepository.create({
    tenantId: actingAdmin.tenantId,
    processId: input.processId,
    title: input.title,
    description: input.description,
    instruction: input.instruction,
    resources: input.resources,
    videoUrl,
    videoProvider,
    links: input.links,
    completionCriteria: input.completionCriteria,
    order,
  });

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "STEP_CREATED",
    resource: "process_step",
    resourceId: step._id,
    metadata: { title: step.title },
  });

  return step;
}

export async function updateStep(
  actingAdmin: RequestIdentity,
  id: ObjectId,
  patch: {
    title?: string;
    description?: string;
    instruction?: string;
    resources?: string[];
    videoUrl?: string | null;
    links?: string[];
    completionCriteria?: string;
    order?: number;
  },
) {
  const current = await stepRepository.findById(actingAdmin.tenantId, id);
  if (!current) throw new NotFoundError();

  const repoPatch: Parameters<typeof stepRepository.update>[2] = {
    title: patch.title,
    description: patch.description,
    instruction: patch.instruction,
    resources: patch.resources,
    links: patch.links,
    completionCriteria: patch.completionCriteria,
    order: patch.order,
  };
  if (patch.videoUrl !== undefined) {
    const resolved = resolveVideo(patch.videoUrl);
    repoPatch.videoUrl = resolved.videoUrl;
    repoPatch.videoProvider = resolved.videoProvider;
  }

  const updated = await stepRepository.update(actingAdmin.tenantId, id, repoPatch);
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "STEP_UPDATED",
    resource: "process_step",
    resourceId: updated._id,
    metadata: { title: updated.title, changes: diffFields(current, repoPatch) },
  });

  return updated;
}

export async function publishStep(actingAdmin: RequestIdentity, id: ObjectId) {
  const current = await stepRepository.findById(actingAdmin.tenantId, id);
  if (!current) throw new NotFoundError();
  assertValidTransition(current.status, "PUBLISHED");

  const updated = await stepRepository.updateStatus(actingAdmin.tenantId, id, "PUBLISHED");
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "STEP_PUBLISHED",
    resource: "process_step",
    resourceId: updated._id,
    metadata: { title: updated.title },
  });

  return updated;
}

export async function archiveStep(actingAdmin: RequestIdentity, id: ObjectId) {
  const current = await stepRepository.findById(actingAdmin.tenantId, id);
  if (!current) throw new NotFoundError();
  assertValidTransition(current.status, "ARCHIVED");

  const updated = await stepRepository.updateStatus(actingAdmin.tenantId, id, "ARCHIVED");
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "STEP_ARCHIVED",
    resource: "process_step",
    resourceId: updated._id,
    metadata: { title: updated.title },
  });

  return updated;
}

/** Reactivar: ARCHIVED -> DRAFT. Nunca directo a PUBLISHED — hay que publicarlo de nuevo explícitamente. */
export async function reactivateStep(actingAdmin: RequestIdentity, id: ObjectId) {
  const current = await stepRepository.findById(actingAdmin.tenantId, id);
  if (!current) throw new NotFoundError();
  assertValidTransition(current.status, "DRAFT");

  const updated = await stepRepository.updateStatus(actingAdmin.tenantId, id, "DRAFT");
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "STEP_REACTIVATED",
    resource: "process_step",
    resourceId: updated._id,
    metadata: { title: updated.title },
  });

  return updated;
}

/** Borrado permanente — ver comentario equivalente en content.service.ts. Solo permitido sobre un paso ya ARCHIVED. */
export async function deleteStep(actingAdmin: RequestIdentity, id: ObjectId): Promise<void> {
  const current = await stepRepository.findById(actingAdmin.tenantId, id);
  if (!current) throw new NotFoundError();
  if (current.status !== "ARCHIVED") {
    throw new ValidationError("Solo se puede borrar un paso que ya esté archivado.");
  }

  const deleted = await stepRepository.remove(actingAdmin.tenantId, id);
  if (!deleted) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "STEP_DELETED",
    resource: "process_step",
    resourceId: id,
    metadata: { title: current.title },
  });
}

/**
 * Cascada completa hasta el paso: si el proceso dueño no está en la lista
 * de procesos visibles (porque él, su etapa o la ruta no están PUBLISHED),
 * sus pasos no aparecen acá aunque cada paso esté PUBLISHED.
 */
export async function resolveVisibleSteps(tenantId: ObjectId, roleId: ObjectId) {
  const { processes } = await resolveVisibleProcesses(tenantId, roleId);
  if (processes.length === 0) return { processes: [] };

  const processIds = processes.map((process) => process._id);
  const steps = await stepRepository.listPublishedByProcesses(tenantId, processIds);

  const stepsByProcess = new Map<string, typeof steps>();
  for (const step of steps) {
    const key = step.processId.toString();
    const bucket = stepsByProcess.get(key) ?? [];
    bucket.push(step);
    stepsByProcess.set(key, bucket);
  }

  return {
    processes: processes.map((process) => ({
      process,
      steps: stepsByProcess.get(process._id.toString()) ?? [],
    })),
  };
}
