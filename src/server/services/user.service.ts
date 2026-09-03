import type { ObjectId } from "mongodb";
import { NotFoundError, ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";
import * as userRepository from "@/server/repositories/user.repository";
import * as roleRepository from "@/server/repositories/role.repository";
import * as auditRepository from "@/server/repositories/audit.repository";

const DEFAULT_PAGE_SIZE = 20;

export async function listUsers(actingAdmin: RequestIdentity, pagination: { page?: number; pageSize?: number }) {
  const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize = pagination.pageSize && pagination.pageSize > 0 ? pagination.pageSize : DEFAULT_PAGE_SIZE;
  return userRepository.listByTenant(actingAdmin.tenantId, { page, pageSize });
}

export async function deactivateUser(actingAdmin: RequestIdentity, targetUserId: ObjectId) {
  if (targetUserId.equals(actingAdmin.userId)) {
    throw new ValidationError("No puedes desactivar tu propia cuenta.");
  }

  const updated = await userRepository.updateStatus(actingAdmin.tenantId, targetUserId, "INACTIVE");
  if (!updated) {
    throw new NotFoundError();
  }

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "USER_DEACTIVATED",
    resource: "user",
    resourceId: updated._id,
  });

  return updated;
}

export async function reactivateUser(actingAdmin: RequestIdentity, targetUserId: ObjectId) {
  const updated = await userRepository.updateStatus(actingAdmin.tenantId, targetUserId, "ACTIVE");
  if (!updated) {
    throw new NotFoundError();
  }

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "USER_REACTIVATED",
    resource: "user",
    resourceId: updated._id,
  });

  return updated;
}

export async function changeFunctionalRole(
  actingAdmin: RequestIdentity,
  targetUserId: ObjectId,
  functionalRoleId: ObjectId,
) {
  const role = await roleRepository.findById(actingAdmin.tenantId, functionalRoleId);
  if (!role) {
    throw new ValidationError("El rol funcional no es válido para este tenant.");
  }

  const previous = await userRepository.findById(actingAdmin.tenantId, targetUserId);
  if (!previous) {
    throw new NotFoundError();
  }

  const updated = await userRepository.updateFunctionalRole(actingAdmin.tenantId, targetUserId, functionalRoleId);
  if (!updated) {
    throw new NotFoundError();
  }

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "USER_ROLE_CHANGED",
    resource: "user",
    resourceId: updated._id,
    metadata: {
      fromRoleId: previous.functionalRoleId?.toString() ?? null,
      toRoleId: functionalRoleId.toString(),
    },
  });

  return updated;
}
