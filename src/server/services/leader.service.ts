import type { ObjectId } from "mongodb";
import { assertValidTransition } from "@/lib/content-status";
import { normalizeVideoUrl } from "@/lib/video-url";
import { NotFoundError, ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";
import type { ContentScope, VideoProvider } from "@/types/enums";
import * as leaderRepository from "@/server/repositories/leader.repository";
import * as mediaRepository from "@/server/repositories/media.repository";
import * as auditRepository from "@/server/repositories/audit.repository";
import { assertRoleIdsBelongToTenant } from "@/server/services/scope-validation";

function resolveVideo(rawVideoUrl: string | null | undefined): { videoUrl: string | null; videoProvider: VideoProvider | null } {
  if (!rawVideoUrl) return { videoUrl: null, videoProvider: null };
  const { provider, embedUrl } = normalizeVideoUrl(rawVideoUrl);
  return { videoUrl: embedUrl, videoProvider: provider };
}

export async function listLeaders(actingAdmin: RequestIdentity) {
  return leaderRepository.listByTenant(actingAdmin.tenantId);
}

export async function createLeader(
  actingAdmin: RequestIdentity,
  input: {
    name: string;
    title: string;
    description: string;
    photoMediaId?: ObjectId;
    videoUrl?: string;
    scope: ContentScope;
    roleIds: ObjectId[];
    order?: number;
  },
) {
  if (input.scope === "ROLE") {
    await assertRoleIdsBelongToTenant(actingAdmin.tenantId, input.roleIds);
  }
  if (input.photoMediaId) {
    const media = await mediaRepository.findById(actingAdmin.tenantId, input.photoMediaId);
    if (!media) throw new ValidationError("photoMediaId no corresponde a un archivo de este tenant.");
  }
  const { videoUrl, videoProvider } = resolveVideo(input.videoUrl);

  const order = input.order ?? (await leaderRepository.maxOrder(actingAdmin.tenantId)) + 1;

  const leader = await leaderRepository.create({
    tenantId: actingAdmin.tenantId,
    name: input.name,
    title: input.title,
    description: input.description,
    photoMediaId: input.photoMediaId ?? null,
    videoUrl,
    videoProvider,
    scope: input.scope,
    roleIds: input.roleIds,
    order,
  });

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "LEADER_CREATED",
    resource: "leader",
    resourceId: leader._id,
  });

  return leader;
}

export async function updateLeader(
  actingAdmin: RequestIdentity,
  id: ObjectId,
  patch: {
    name?: string;
    title?: string;
    description?: string;
    photoMediaId?: ObjectId | null;
    videoUrl?: string | null;
    scope?: ContentScope;
    roleIds?: ObjectId[];
    order?: number;
  },
) {
  const current = await leaderRepository.findById(actingAdmin.tenantId, id);
  if (!current) throw new NotFoundError();

  const effectiveScope = patch.scope ?? current.scope;
  if (effectiveScope === "ROLE") {
    const effectiveRoleIds = patch.roleIds ?? current.roleIds;
    await assertRoleIdsBelongToTenant(actingAdmin.tenantId, effectiveRoleIds);
  }
  if (patch.photoMediaId) {
    const media = await mediaRepository.findById(actingAdmin.tenantId, patch.photoMediaId);
    if (!media) throw new ValidationError("photoMediaId no corresponde a un archivo de este tenant.");
  }

  const repoPatch: Parameters<typeof leaderRepository.update>[2] = {
    name: patch.name,
    title: patch.title,
    description: patch.description,
    photoMediaId: patch.photoMediaId,
    scope: patch.scope,
    roleIds: patch.roleIds,
    order: patch.order,
  };
  if (patch.videoUrl !== undefined) {
    const resolved = resolveVideo(patch.videoUrl);
    repoPatch.videoUrl = resolved.videoUrl;
    repoPatch.videoProvider = resolved.videoProvider;
  }

  const updated = await leaderRepository.update(actingAdmin.tenantId, id, repoPatch);
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "LEADER_UPDATED",
    resource: "leader",
    resourceId: updated._id,
  });

  return updated;
}

export async function publishLeader(actingAdmin: RequestIdentity, id: ObjectId) {
  const current = await leaderRepository.findById(actingAdmin.tenantId, id);
  if (!current) throw new NotFoundError();
  assertValidTransition(current.status, "PUBLISHED");

  const updated = await leaderRepository.updateStatus(actingAdmin.tenantId, id, "PUBLISHED");
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "LEADER_PUBLISHED",
    resource: "leader",
    resourceId: updated._id,
  });

  return updated;
}

export async function archiveLeader(actingAdmin: RequestIdentity, id: ObjectId) {
  const current = await leaderRepository.findById(actingAdmin.tenantId, id);
  if (!current) throw new NotFoundError();
  assertValidTransition(current.status, "ARCHIVED");

  const updated = await leaderRepository.updateStatus(actingAdmin.tenantId, id, "ARCHIVED");
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "LEADER_ARCHIVED",
    resource: "leader",
    resourceId: updated._id,
  });

  return updated;
}

/**
 * A diferencia de content_items, un líder no cuelga de una etapa —
 * "Conoce a tu equipo" es información general del tenant, no ligada a la
 * cascada ruta->etapa. Solo depende de su propio status + scope/roleIds.
 */
export async function resolveVisibleLeaders(tenantId: ObjectId, roleId: ObjectId) {
  return leaderRepository.findVisibleForRole(tenantId, roleId);
}
