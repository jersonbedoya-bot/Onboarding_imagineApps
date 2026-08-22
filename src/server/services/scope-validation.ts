import type { ObjectId } from "mongodb";
import { ValidationError } from "@/server/errors";
import * as roleRepository from "@/server/repositories/role.repository";

/**
 * Único punto de validación del patrón scope+roleIds compartido por
 * content_items, leaders y processes (mismo modelo mental de control de
 * acceso en todo el sistema — ver decisión de Fase 3B).
 */
export async function assertRoleIdsBelongToTenant(tenantId: ObjectId, roleIds: ObjectId[]): Promise<void> {
  if (roleIds.length === 0) {
    throw new ValidationError("Un scope ROLE necesita al menos un roleId.");
  }
  const roles = await Promise.all(roleIds.map((roleId) => roleRepository.findById(tenantId, roleId)));
  if (roles.some((role) => !role)) {
    throw new ValidationError("Alguno de los roleIds no corresponde a un rol de este tenant.");
  }
}
