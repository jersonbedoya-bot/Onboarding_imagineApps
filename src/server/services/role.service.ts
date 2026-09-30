import type { ObjectId } from "mongodb";
import { NotFoundError, ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";
import { slugify } from "@/lib/slug";
import * as roleRepository from "@/server/repositories/role.repository";
import * as userRepository from "@/server/repositories/user.repository";
import * as auditRepository from "@/server/repositories/audit.repository";

/**
 * Antes la única forma de agregar un rol funcional (Diseño, Ventas...) era
 * que un desarrollador corriera `npm run db:seed` con un cambio de código —
 * bloqueaba por completo la invitación de Imaginers en un tenant nuevo sin
 * roles todavía (el form de invitación exige elegir uno). `key` ya no
 * necesita ser uno de los 2 valores fijos del seed (ver comentario en
 * role.repository.ts) — acá se genera a partir del nombre, con un sufijo
 * numérico si ya existe uno igual para este tenant (el índice único
 * {tenantId, key} es la garantía real, esto solo evita el primer choque
 * obvio de dos roles con el mismo nombre).
 */
async function generateUniqueKey(tenantId: ObjectId, label: string): Promise<string> {
  const base = slugify(label).toUpperCase() || "ROL";
  let candidate = base;
  let suffix = 2;
  while (await roleRepository.findByKey(tenantId, candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/** Para /admin/roles — a diferencia de listByTenant (usado por todos lados para poblar selects), acá se necesita ver también los inactivos para poder reactivarlos. */
export async function listRolesForAdmin(actingAdmin: RequestIdentity) {
  const roles = await roleRepository.listByTenant(actingAdmin.tenantId, { includeInactive: true });
  const counts = await Promise.all(roles.map((role) => userRepository.countByFunctionalRole(actingAdmin.tenantId, role._id)));
  return roles.map((role, i) => ({ ...role, peopleCount: counts[i] }));
}

export async function createRole(actingAdmin: RequestIdentity, input: { label: string }) {
  const key = await generateUniqueKey(actingAdmin.tenantId, input.label);
  const role = await roleRepository.create({ tenantId: actingAdmin.tenantId, key, label: input.label });

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "ROLE_CREATED",
    resource: "role",
    resourceId: role._id,
    metadata: { label: role.label },
  });

  return role;
}

export async function renameRole(actingAdmin: RequestIdentity, id: ObjectId, label: string) {
  const current = await roleRepository.findById(actingAdmin.tenantId, id);
  if (!current) throw new NotFoundError();

  const updated = await roleRepository.updateLabel(actingAdmin.tenantId, id, label);
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "ROLE_UPDATED",
    resource: "role",
    resourceId: updated._id,
    metadata: { from: current.label, to: updated.label },
  });

  return updated;
}

/**
 * Desactivar (no borrar): un rol puede tener Imaginers, contenido y líderes
 * ya apuntándole por roleId — borrarlo de verdad dejaría esas referencias
 * colgando. INACTIVE lo saca de roleRepository.listByTenant (todos los
 * selects de "elegir rol" del panel) sin tocar nada de lo ya asignado.
 */
export async function deactivateRole(actingAdmin: RequestIdentity, id: ObjectId) {
  const current = await roleRepository.findById(actingAdmin.tenantId, id);
  if (!current) throw new NotFoundError();
  if (current.status === "INACTIVE") throw new ValidationError("Este rol ya está desactivado.");

  const updated = await roleRepository.updateStatus(actingAdmin.tenantId, id, "INACTIVE");
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "ROLE_DEACTIVATED",
    resource: "role",
    resourceId: updated._id,
    metadata: { label: updated.label },
  });

  return updated;
}

export async function reactivateRole(actingAdmin: RequestIdentity, id: ObjectId) {
  const current = await roleRepository.findById(actingAdmin.tenantId, id);
  if (!current) throw new NotFoundError();
  if (current.status === "ACTIVE") throw new ValidationError("Este rol ya está activo.");

  const updated = await roleRepository.updateStatus(actingAdmin.tenantId, id, "ACTIVE");
  if (!updated) throw new NotFoundError();

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "ROLE_REACTIVATED",
    resource: "role",
    resourceId: updated._id,
    metadata: { label: updated.label },
  });

  return updated;
}
