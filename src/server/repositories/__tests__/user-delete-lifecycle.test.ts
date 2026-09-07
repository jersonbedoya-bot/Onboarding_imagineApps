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

function actingAdminFor(tenantId: ObjectId, userId?: ObjectId): RequestIdentity {
  return { userId: userId ?? new ObjectId(), tenantId, status: "ACTIVE", platformRole: "ADMIN", functionalRoleId: null };
}

/**
 * user.service.deleteUser sigue el mismo flujo de 2 pasos que
 * content.service.deleteContentItem (archivar/desactivar -> borrar, nunca
 * de un tirón) — ver comentario en deleteUser.
 */
describe("user.service.deleteUser — flujo de 2 pasos y guardas", () => {
  it("rechaza borrar un user todavía ACTIVE (falta desactivar primero) -> ValidationError", async () => {
    const { tenant, user } = await makeTenantWithUser("active");
    const admin = actingAdminFor(tenant._id);

    await expect(userService.deleteUser(admin, user._id)).rejects.toBeInstanceOf(ValidationError);

    const stillThere = await userRepository.findById(tenant._id, user._id);
    expect(stillThere).not.toBeNull();
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
