import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import * as tenantRepository from "@/server/repositories/tenant.repository";
import * as roleRepository from "@/server/repositories/role.repository";
import * as invitationService from "@/server/services/invitation.service";
import * as userRepository from "@/server/repositories/user.repository";
import { ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";

async function makeTenant(suffix: string) {
  const tenant = await tenantRepository.create({ name: `Tenant ${suffix}`, slug: `tenant-invite-admin-${suffix}` });
  const role = await roleRepository.create({ tenantId: tenant._id, key: "PDM", label: "PDM" });
  return { tenant, role };
}

function actingAdminFor(tenantId: ObjectId): RequestIdentity {
  return { userId: new ObjectId(), tenantId, status: "ACTIVE", platformRole: "ADMIN", functionalRoleId: null };
}

describe("invitation.service — invitar administradores", () => {
  it("createInvitation con platformRole ADMIN no exige functionalRoleId", async () => {
    const { tenant } = await makeTenant("ok");
    const admin = actingAdminFor(tenant._id);

    const { invitation, message } = await invitationService.createInvitation(admin, {
      email: "nuevo-admin@example.com",
      platformRole: "ADMIN",
    });

    expect(invitation.platformRole).toBe("ADMIN");
    expect(invitation.functionalRoleId).toBeNull();
    expect(message).toContain("Administrador");
  });

  it("createInvitation con platformRole ADMIN + functionalRoleId -> ValidationError", async () => {
    const { tenant, role } = await makeTenant("reject-role");
    const admin = actingAdminFor(tenant._id);

    await expect(
      invitationService.createInvitation(admin, {
        email: "admin-con-rol@example.com",
        platformRole: "ADMIN",
        functionalRoleId: role._id,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("createInvitation con platformRole USER sin functionalRoleId -> ValidationError", async () => {
    const { tenant } = await makeTenant("reject-no-role");
    const admin = actingAdminFor(tenant._id);

    await expect(
      invitationService.createInvitation(admin, { email: "user-sin-rol@example.com", platformRole: "USER" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("createInvitation sin platformRole (default USER) sigue exigiendo functionalRoleId — compat hacia atrás", async () => {
    const { tenant, role } = await makeTenant("default");
    const admin = actingAdminFor(tenant._id);

    const { invitation } = await invitationService.createInvitation(admin, {
      email: "default-user@example.com",
      functionalRoleId: role._id,
    });

    expect(invitation.platformRole).toBe("USER");
    expect(invitation.functionalRoleId?.toString()).toBe(role._id.toString());
  });

  it("previewInvitation de una invitación ADMIN muestra roleLabel Administrador", async () => {
    const { tenant } = await makeTenant("preview");
    const admin = actingAdminFor(tenant._id);

    const { link } = await invitationService.createInvitation(admin, {
      email: "preview-admin@example.com",
      platformRole: "ADMIN",
    });
    const rawToken = link.split("/").pop()!;

    const preview = await invitationService.previewInvitation(rawToken);
    expect(preview.roleLabel).toBe("Administrador");
  });

  it("acceptInvitation de una invitación ADMIN crea un user con platformRole ADMIN y functionalRoleId null", async () => {
    const { tenant } = await makeTenant("accept");
    const admin = actingAdminFor(tenant._id);

    const { link } = await invitationService.createInvitation(admin, {
      email: "accept-admin@example.com",
      platformRole: "ADMIN",
    });
    const rawToken = link.split("/").pop()!;

    const { userId } = await invitationService.acceptInvitation(rawToken, {
      name: "Nuevo Admin",
      password: "adminpass123",
    });

    const created = await userRepository.findByEmail("accept-admin@example.com");
    expect(created?._id.toString()).toBe(userId.toString());
    expect(created?.platformRole).toBe("ADMIN");
    expect(created?.functionalRoleId).toBeNull();
    expect(created?.status).toBe("ACTIVE");
  });
});
