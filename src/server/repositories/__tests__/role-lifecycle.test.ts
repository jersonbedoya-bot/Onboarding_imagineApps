import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import * as tenantRepository from "@/server/repositories/tenant.repository";
import * as roleService from "@/server/services/role.service";
import { NotFoundError, ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";

async function makeTenant(suffix: string) {
  return tenantRepository.create({ name: `Tenant ${suffix}`, slug: `tenant-role-${suffix}` });
}

function actingAdminFor(tenantId: ObjectId): RequestIdentity {
  return { userId: new ObjectId(), tenantId, status: "ACTIVE", platformRole: "ADMIN", functionalRoleId: null };
}

describe("role.service", () => {
  it("crea un rol y genera una key propia — no exige que sea PDM/UX_UI_DESIGNER", async () => {
    const tenant = await makeTenant("create");
    const admin = actingAdminFor(tenant._id);

    const role = await roleService.createRole(admin, { label: "Contabilidad" });

    expect(role.label).toBe("Contabilidad");
    expect(role.key).toBe("CONTABILIDAD");
    expect(role.status).toBe("ACTIVE");
  });

  it("dos roles con el mismo nombre en el mismo tenant no chocan por key duplicada", async () => {
    const tenant = await makeTenant("dup");
    const admin = actingAdminFor(tenant._id);

    const first = await roleService.createRole(admin, { label: "Ventas" });
    const second = await roleService.createRole(admin, { label: "Ventas" });

    expect(first.key).not.toBe(second.key);
  });

  it("renombrar un rol cambia el label sin tocar la key", async () => {
    const tenant = await makeTenant("rename");
    const admin = actingAdminFor(tenant._id);
    const role = await roleService.createRole(admin, { label: "Diseño (borrador)" });

    const renamed = await roleService.renameRole(admin, role._id, "Diseño");

    expect(renamed.label).toBe("Diseño");
    expect(renamed.key).toBe(role.key);
  });

  it("desactivar un rol lo saca de listRolesForAdmin activos pero se puede reactivar", async () => {
    const tenant = await makeTenant("deactivate");
    const admin = actingAdminFor(tenant._id);
    const role = await roleService.createRole(admin, { label: "Soporte" });

    await roleService.deactivateRole(admin, role._id);
    const afterDeactivate = await roleService.listRolesForAdmin(admin);
    expect(afterDeactivate.find((r) => r._id.equals(role._id))?.status).toBe("INACTIVE");

    await roleService.reactivateRole(admin, role._id);
    const afterReactivate = await roleService.listRolesForAdmin(admin);
    expect(afterReactivate.find((r) => r._id.equals(role._id))?.status).toBe("ACTIVE");
  });

  it("desactivar un rol ya inactivo -> ValidationError", async () => {
    const tenant = await makeTenant("already-inactive");
    const admin = actingAdminFor(tenant._id);
    const role = await roleService.createRole(admin, { label: "Legal" });
    await roleService.deactivateRole(admin, role._id);

    await expect(roleService.deactivateRole(admin, role._id)).rejects.toBeInstanceOf(ValidationError);
  });

  it("admin de otro tenant no puede renombrar ni desactivar un rol ajeno -> NotFoundError", async () => {
    const tenantA = await makeTenant("cross-a");
    const tenantB = await makeTenant("cross-b");
    const adminA = actingAdminFor(tenantA._id);
    const adminB = actingAdminFor(tenantB._id);

    const role = await roleService.createRole(adminA, { label: "Marketing" });

    await expect(roleService.renameRole(adminB, role._id, "Otro nombre")).rejects.toBeInstanceOf(NotFoundError);
    await expect(roleService.deactivateRole(adminB, role._id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
