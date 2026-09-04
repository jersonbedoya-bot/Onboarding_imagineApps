import type { ObjectId } from "mongodb";
import { NotFoundError, ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";
import type { PlatformRole } from "@/types/enums";
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

/**
 * Cambia el nivel de acceso de un usuario (USER/EDITOR/ADMIN) — acción
 * nueva, separada a propósito de changeFunctionalRole: son dos ejes
 * distintos (rol funcional = qué onboarding ve un USER; nivel de acceso =
 * qué puede hacer en el panel admin) y esta es bastante más sensible
 * (otorga o quita entrada al panel), por eso vive en su propio audit
 * action (USER_PLATFORM_ROLE_CHANGED) y su propio endpoint.
 *
 * Dos guardas que hoy no existían para ningún otro cambio de usuario:
 * - No podés cambiarte el nivel a vos mismo (mismo criterio que
 *   deactivateUser con isSelf).
 * - No se puede dejar el tenant sin NINGÚN admin activo — si el usuario a
 *   degradar es el único ADMIN activo, se rechaza. (deactivateUser no
 *   tiene todavía esta misma protección — no se tocó acá, es una acción
 *   distinta y ya existente.)
 */
export async function changePlatformRole(
  actingAdmin: RequestIdentity,
  targetUserId: ObjectId,
  input: { platformRole: PlatformRole; functionalRoleId?: ObjectId },
) {
  if (targetUserId.equals(actingAdmin.userId)) {
    throw new ValidationError("No puedes cambiar tu propio nivel de acceso.");
  }

  const previous = await userRepository.findById(actingAdmin.tenantId, targetUserId);
  if (!previous) {
    throw new NotFoundError();
  }

  if (previous.status === "ACTIVE" && previous.platformRole === "ADMIN" && input.platformRole !== "ADMIN") {
    const activeAdmins = await userRepository.countActiveAdmins(actingAdmin.tenantId);
    if (activeAdmins <= 1) {
      throw new ValidationError("No puedes quitarle el rol de administrador al único admin activo del tenant.");
    }
  }

  let functionalRoleId: ObjectId | null = null;
  if (input.platformRole === "USER") {
    if (!input.functionalRoleId) {
      throw new ValidationError("Un usuario necesita un rol funcional.");
    }
    const role = await roleRepository.findById(actingAdmin.tenantId, input.functionalRoleId);
    if (!role) {
      throw new ValidationError("El rol funcional no es válido para este tenant.");
    }
    functionalRoleId = input.functionalRoleId;
  }

  const updated = await userRepository.updatePlatformRole(actingAdmin.tenantId, targetUserId, {
    platformRole: input.platformRole,
    functionalRoleId,
  });
  if (!updated) {
    throw new NotFoundError();
  }

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "USER_PLATFORM_ROLE_CHANGED",
    resource: "user",
    resourceId: updated._id,
    metadata: { from: previous.platformRole, to: input.platformRole },
  });

  return updated;
}
