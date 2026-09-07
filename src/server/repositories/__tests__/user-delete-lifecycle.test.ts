import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import * as tenantRepository from "@/server/repositories/tenant.repository";
import * as roleRepository from "@/server/repositories/role.repository";
import * as userRepository from "@/server/repositories/user.repository";
import * as userService from "@/server/services/user.service";
import { NotFoundError, ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";

async function makeTenantWithUser(suffix: string) {
  const tenant = await tenantRepository.create({ name: `Tenant ${suffix}`, slug: `tenant-del-${suffix}` });
  const role = await roleRepository.create({ tenantId: tenant._id, key: "PDM", label: "PDM" });
  const user = await userRepository.create({
    tenantId: tenant._id,
    email: `user-del-${suffix}@example.com`,
    name: `User ${suffix}`,
    passwordHash: null,
    platformRole: "USER",
    functionalRoleId: role._id,
    status: "ACTIVE",
  });
  return { tenant, role, user };
}

async function makeTenantWithAdmin(suffix: string) {
  const tenant = await tenantRepository.create({ name: `Tenant ${suffix}`, slug: `tenant-del-${suffix}` });
  const admin = await userRepository.create({
    tenantId: tenant._id,
    email: `admin-del-${suffix}@example.com`,
    name: `Admin ${suffix}`,
    passwordHash: null,
    platformRole: "ADMIN",
    functionalRoleId: null,
    status: "ACTIVE",
  });
  return { tenant, admin };
}

function actingAdminFor(tenantId: ObjectId, userId?: ObjectId): RequestIdentity {
  return { userId: userId ?? new ObjectId(), tenantId, status: "ACTIVE", platformRole: "ADMIN", functionalRoleId: null };
}

/**
 * user.service.deleteUser ya no exige desactivar primero (el usuario pidió
 * poder borrar directo a un user ACTIVE) — la guarda que reemplaza esa
 * protección implícita es "no dejar el tenant sin ningún admin activo",
 * mismo criterio que changePlatformRole. El flujo de 2 pasos (desactivar
 * -> borrar) sigue funcionando, solo dejó de ser obligatorio.
 */
describe("user.service.deleteUser — borrado directo y guardas", () => {
  it("permite borrar un user ACTIVE directamente, sin desactivar primero", async () => {
    const { tenant, user } = await makeTenantWithUser("active");
    const admin = actingAdminFor(tenant._id);

    await userService.deleteUser(admin, user._id);

    const gone = await userRepository.findById(tenant._id, user._id);
    expect(gone).toBeNull();
  });

  it("rechaza borrar al único admin ACTIVE del tenant -> ValidationError", async () => {
    const { tenant, admin: targetAdmin } = await makeTenantWithAdmin("only-admin");
    const actingAdmin = actingAdminFor(tenant._id);

    await expect(userService.deleteUser(actingAdmin, targetAdmin._id)).rejects.toBeInstanceOf(ValidationError);

    const stillThere = await userRepository.findById(tenant._id, targetAdmin._id);
    expect(stillThere).not.toBeNull();
  });

  it("permite borrar a un admin ACTIVE si hay otro admin activo en el tenant", async () => {
    const { tenant, admin: firstAdmin } = await makeTenantWithAdmin("multi-admin");
    const secondAdmin = await userRepository.create({
      tenantId: tenant._id,
      email: "admin-del-multi-admin-2@example.com",
      name: "Admin multi-admin 2",
      passwordHash: null,
      platformRole: "ADMIN",
      functionalRoleId: null,
      status: "ACTIVE",
    });
    const actingAdmin = actingAdminFor(tenant._id, secondAdmin._id);

    await userService.deleteUser(actingAdmin, firstAdmin._id);

    const gone = await userRepository.findById(tenant._id, firstAdmin._id);
    expect(gone).toBeNull();
  });

  it("rechaza que un admin se borre a sí mismo -> ValidationError", async () => {
    const { tenant } = await makeTenantWithUser("self");
    const adminId = new ObjectId();
    const admin = actingAdminFor(tenant._id, adminId);

    await expect(userService.deleteUser(admin, adminId)).rejects.toBeInstanceOf(ValidationError);
  });

  it("borrar un id inexistente -> NotFoundError", async () => {
    const { tenant } = await makeTenantWithUser("missing");
    const admin = actingAdminFor(tenant._id);

    await expect(userService.deleteUser(admin, new ObjectId())).rejects.toBeInstanceOf(NotFoundError);
  });

  it("desactivar y luego borrar deja al user fuera de la base para siempre", async () => {
    const { tenant, user } = await makeTenantWithUser("ok");
    const admin = actingAdminFor(tenant._id);

    await userService.deactivateUser(admin, user._id);
    await userService.deleteUser(admin, user._id);

    const gone = await userRepository.findById(tenant._id, user._id);
    expect(gone).toBeNull();
  });
});
