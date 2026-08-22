import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import * as tenantRepository from "@/server/repositories/tenant.repository";
import * as roleRepository from "@/server/repositories/role.repository";
import * as userRepository from "@/server/repositories/user.repository";
import * as userService from "@/server/services/user.service";
import { NotFoundError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";

async function makeTenantWithUser(suffix: string) {
  const tenant = await tenantRepository.create({ name: `Tenant ${suffix}`, slug: `tenant-${suffix}` });
  const role = await roleRepository.create({ tenantId: tenant._id, key: "PDM", label: "PDM" });
  const user = await userRepository.create({
    tenantId: tenant._id,
    email: `user-${suffix}@example.com`,
    name: `User ${suffix}`,
    passwordHash: null,
    platformRole: "USER",
    functionalRoleId: role._id,
    status: "ACTIVE",
  });
  return { tenant, role, user };
}

function actingAdminFor(tenantId: ObjectId): RequestIdentity {
  return {
    userId: new ObjectId(),
    tenantId,
    status: "ACTIVE",
    platformRole: "ADMIN",
    functionalRoleId: null,
  };
}

describe("aislamiento de tenant — user.repository", () => {
  it("updateStatus no afecta a un user de otro tenant (devuelve null)", async () => {
    const { tenant: tenantA, user: userA } = await makeTenantWithUser("a");
    const { tenant: tenantB } = await makeTenantWithUser("b");

    const result = await userRepository.updateStatus(tenantB._id, userA._id, "INACTIVE");
    expect(result).toBeNull();

    const stillActive = await userRepository.findById(tenantA._id, userA._id);
    expect(stillActive?.status).toBe("ACTIVE");
  });

  it("updateStatus SÍ afecta a un user del mismo tenant (control positivo)", async () => {
    const { tenant, user } = await makeTenantWithUser("same");
    const result = await userRepository.updateStatus(tenant._id, user._id, "INACTIVE");
    expect(result?.status).toBe("INACTIVE");
  });

  it("updateFunctionalRole no afecta a un user de otro tenant", async () => {
    const { user: userA } = await makeTenantWithUser("c");
    const { tenant: tenantB, role: roleB } = await makeTenantWithUser("d");

    const result = await userRepository.updateFunctionalRole(tenantB._id, userA._id, roleB._id);
    expect(result).toBeNull();
  });

  it("findById no devuelve un user de otro tenant", async () => {
    const { user: userA } = await makeTenantWithUser("e");
    const { tenant: tenantB } = await makeTenantWithUser("f");

    const result = await userRepository.findById(tenantB._id, userA._id);
    expect(result).toBeNull();
  });
});

describe("aislamiento de tenant — user.service (admin de un tenant contra recurso de otro)", () => {
  it("deactivateUser: admin de tenant B no puede desactivar un user de tenant A -> NotFoundError", async () => {
    const { user: userA } = await makeTenantWithUser("g");
    const { tenant: tenantB } = await makeTenantWithUser("h");
    const adminOfB = actingAdminFor(tenantB._id);

    await expect(userService.deactivateUser(adminOfB, userA._id)).rejects.toBeInstanceOf(NotFoundError);

    const stillActive = await userRepository.findById((await tenantRepository.findBySlug("tenant-g"))!._id, userA._id);
    expect(stillActive?.status).toBe("ACTIVE");
  });

  it("changeFunctionalRole: admin de tenant B no puede cambiar el rol de un user de tenant A -> NotFoundError", async () => {
    const { user: userA } = await makeTenantWithUser("i");
    const { tenant: tenantB, role: roleB } = await makeTenantWithUser("j");
    const adminOfB = actingAdminFor(tenantB._id);

    await expect(userService.changeFunctionalRole(adminOfB, userA._id, roleB._id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("deactivateUser: admin SÍ puede desactivar un user de su propio tenant (control positivo)", async () => {
    const { tenant, user } = await makeTenantWithUser("k");
    const admin = actingAdminFor(tenant._id);

    const updated = await userService.deactivateUser(admin, user._id);
    expect(updated.status).toBe("INACTIVE");
  });
});
