import type { ObjectId } from "mongodb";
import { assertValidTransition } from "@/lib/content-status";
import { normalizeVideoUrl, getVideoThumbnailUrl } from "@/lib/video-url";
import { diffFields } from "@/lib/audit-diff";
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

async function buildPhotoUrlMap(tenantId: ObjectId, leaders: { photoMediaId: ObjectId | null }[]): Promise<Map<string, string>> {
  const mediaIds = leaders.map((leader) => leader.photoMediaId).filter((id): id is ObjectId => id !== null);
  const mediaDocs = await mediaRepository.findByIds(tenantId, mediaIds);
  return new Map(mediaDocs.map((media) => [media._id.toString(), media.url]));
}

/**
 * Igual que listLeaders, pero con photoUrl ya resuelta — lo usa el panel
 * admin para mostrar la foto/preview de video ya asignada al editar (antes
 * el form de edición no tenía forma de reflejar "este líder ya tiene foto",
 * solo se veía después de subir una nueva en esa misma sesión).
 */
export async function listLeadersWithMedia(actingAdmin: RequestIdentity) {
  const leaders = await leaderRepository.listByTenant(actingAdmin.tenantId);
  const photoUrlById = await buildPhotoUrlMap(actingAdmin.tenantId, leaders);

  return leaders.map((leader) => ({
    ...leader,
    photoUrl: leader.photoMediaId ? (photoUrlById.get(leader.photoMediaId.toString()) ?? null) : null,
  }));
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
    metadata: { name: leader.name },
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
    metadata: { name: updated.name, changes: diffFields(current, patch) },
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
    metadata: { name: updated.name },
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
    metadata: { name: updated.name },
  });

  return updated;
}

/** Reactivar: ARCHIVED -> DRAFT. Nunca directo a PUBLISHED — hay que publicarlo de nuevo explícitamente. */
export async function reactivateLeader(actingAdmin: RequestIdentity, id: ObjectId) {
  const current = await leaderRepository.findById(actingAdmin.tenantId, id);
  if (!current) throw new NotFoundError();
  assertValidTransition(current.status, "DRAFT");

  const updated = await leaderRepository.updateStatus(actingAdmin.tenantId, id, "DRAFT");
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "LEADER_REACTIVATED",
    resource: "leader",
    resourceId: updated._id,
    metadata: { name: updated.name },
  });

  return updated;
}

/** Borrado permanente — ver comentario equivalente en content.service.ts. Solo permitido sobre un líder ya ARCHIVED. */
export async function deleteLeader(actingAdmin: RequestIdentity, id: ObjectId): Promise<void> {
  const current = await leaderRepository.findById(actingAdmin.tenantId, id);
  if (!current) throw new NotFoundError();
  if (current.status !== "ARCHIVED") {
    throw new ValidationError("Solo se puede borrar un líder que ya esté archivado.");
  }

  const deleted = await leaderRepository.remove(actingAdmin.tenantId, id);
  if (!deleted) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "LEADER_DELETED",
    resource: "leader",
    resourceId: id,
    metadata: { name: current.name },
  });
}

/**
 * A diferencia de content_items, un líder no cuelga de una etapa —
 * "Conoce a tu equipo" es información general del tenant, no ligada a la
 * cascada ruta->etapa. Solo depende de su propio status + scope/roleIds.
 */
export async function resolveVisibleLeaders(tenantId: ObjectId, roleId: ObjectId) {
  return leaderRepository.findVisibleForRole(tenantId, roleId);
}

/** Igual que resolveVisibleLeaders, pero ya con la foto resuelta a URL — lo que consume /onboarding. */
export async function resolveVisibleLeadersWithMedia(tenantId: ObjectId, roleId: ObjectId) {
  const leaders = await leaderRepository.findVisibleForRole(tenantId, roleId);
  const photoUrlById = await buildPhotoUrlMap(tenantId, leaders);

  return leaders.map((leader) => ({
    id: leader._id.toString(),
    name: leader.name,
    title: leader.title,
    description: leader.description,
    photoUrl: leader.photoMediaId ? (photoUrlById.get(leader.photoMediaId.toString()) ?? null) : null,
    videoUrl: leader.videoUrl,
    videoProvider: leader.videoProvider,
    videoThumbnailUrl:
      leader.videoUrl && leader.videoProvider ? getVideoThumbnailUrl(leader.videoUrl, leader.videoProvider) : null,
    scope: leader.scope,
  }));
}
