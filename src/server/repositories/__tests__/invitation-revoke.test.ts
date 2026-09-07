import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import * as tenantRepository from "@/server/repositories/tenant.repository";
import * as roleRepository from "@/server/repositories/role.repository";
import * as invitationRepository from "@/server/repositories/invitation.repository";
import * as invitationService from "@/server/services/invitation.service";
import { NotFoundError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";

async function makeTenant(suffix: string) {
  const tenant = await tenantRepository.create({ name: `Tenant ${suffix}`, slug: `tenant-revoke-${suffix}` });
  const role = await roleRepository.create({ tenantId: tenant._id, key: "PDM", label: "PDM" });
  return { tenant, role };
}

function actingAdminFor(tenantId: ObjectId): RequestIdentity {
  return { userId: new ObjectId(), tenantId, status: "ACTIVE", platformRole: "ADMIN", functionalRoleId: null };
}

describe("invitation.service.revokeInvitation", () => {
  it("revoca una invitación PENDING -> queda REVOKED", async () => {
    const { tenant, role } = await makeTenant("ok");
    const admin = actingAdminFor(tenant._id);
    const { invitation } = await invitationService.createInvitation(admin, {
      email: "revoke-ok@example.com",
      functionalRoleId: role._id,
    });

    const revoked = await invitationService.revokeInvitation(admin, invitation._id);
    expect(revoked.status).toBe("REVOKED");
  });

  it("después de revocar, se puede invitar de nuevo al mismo email sin esperar que expire", async () => {
    const { tenant, role } = await makeTenant("resend");
    const admin = actingAdminFor(tenant._id);
    const { invitation } = await invitationService.createInvitation(admin, {
      email: "revoke-resend@example.com",
      functionalRoleId: role._id,
    });
    await invitationService.revokeInvitation(admin, invitation._id);

    const second = await invitationService.createInvitation(admin, {
      email: "revoke-resend@example.com",
      functionalRoleId: role._id,
    });
    expect(second.invitation.status).toBe("PENDING");
    expect(second.invitation._id.toString()).not.toBe(invitation._id.toString());
  });

  it("revocar una invitación que ya fue aceptada -> NotFoundError", async () => {
    const { tenant, role } = await makeTenant("accepted");
    const admin = actingAdminFor(tenant._id);
    const { invitation, link } = await invitationService.createInvitation(admin, {
      email: "revoke-accepted@example.com",
      functionalRoleId: role._id,
    });
    const rawToken = link.split("/").pop()!;
    await invitationService.acceptInvitation(rawToken, { name: "Alguien", password: "password123" });

    await expect(invitationService.revokeInvitation(admin, invitation._id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("revocar dos veces la misma invitación -> la segunda es NotFoundError", async () => {
    const { tenant, role } = await makeTenant("twice");
    const admin = actingAdminFor(tenant._id);
    const { invitation } = await invitationService.createInvitation(admin, {
      email: "revoke-twice@example.com",
      functionalRoleId: role._id,
    });

    await invitationService.revokeInvitation(admin, invitation._id);
    await expect(invitationService.revokeInvitation(admin, invitation._id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("admin de otro tenant no puede revocar una invitación ajena -> NotFoundError", async () => {
    const { tenant: tenantA, role: roleA } = await makeTenant("cross-a");
    const { tenant: tenantB } = await makeTenant("cross-b");
    const adminA = actingAdminFor(tenantA._id);
    const adminB = actingAdminFor(tenantB._id);

    const { invitation } = await invitationService.createInvitation(adminA, {
      email: "revoke-cross@example.com",
      functionalRoleId: roleA._id,
    });

    await expect(invitationService.revokeInvitation(adminB, invitation._id)).rejects.toBeInstanceOf(NotFoundError);

    const stillPending = await invitationRepository.findExistingActiveByEmail(tenantA._id, "revoke-cross@example.com");
    expect(stillPending?.status).toBe("PENDING");
  });
});
