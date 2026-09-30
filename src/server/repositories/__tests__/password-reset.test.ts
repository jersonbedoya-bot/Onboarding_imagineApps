import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import * as tenantRepository from "@/server/repositories/tenant.repository";
import * as userRepository from "@/server/repositories/user.repository";
import * as passwordResetRepository from "@/server/repositories/password-reset.repository";
import * as passwordResetService from "@/server/services/password-reset.service";
import * as userService from "@/server/services/user.service";
import { getDb } from "@/server/db/client";
import { hashToken } from "@/lib/token";
import { NotFoundError, ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";

async function makeTenantWithUser(suffix: string, status: "ACTIVE" | "INACTIVE" = "ACTIVE") {
  const tenant = await tenantRepository.create({ name: `Tenant ${suffix}`, slug: `tenant-pwreset-${suffix}` });
  const user = await userRepository.create({
    tenantId: tenant._id,
    email: `pwreset-${suffix}@example.com`,
    name: `Persona ${suffix}`,
    passwordHash: await bcrypt.hash("vieja1234", 4),
    platformRole: "USER",
    functionalRoleId: null,
    status,
  });
  const admin: RequestIdentity = { userId: new ObjectId(), tenantId: tenant._id, status: "ACTIVE", platformRole: "ADMIN", functionalRoleId: null };
  return { tenant, user, admin };
}

function tokenFrom(link: string): string {
  return link.split("/").pop()!;
}

describe("password-reset.service", () => {
  it("pedir ayuda con un email real deja una sola solicitud visible para el admin (repetirlo no duplica)", async () => {
    const { user, admin } = await makeTenantWithUser("request");

    await passwordResetService.requestPasswordReset(user.email);
    await passwordResetService.requestPasswordReset(user.email.toUpperCase());

    const pending = await passwordResetService.listPendingPasswordResetRequests(admin);
    expect(pending).toHaveLength(1);
    expect(pending[0].email).toBe(user.email);
  });

  it("un email que no existe no falla ni deja rastro (no revela si la cuenta existe)", async () => {
    await expect(passwordResetService.requestPasswordReset("nadie-existe@example.com")).resolves.toBeUndefined();
  });

  it("una cuenta desactivada tampoco deja solicitud", async () => {
    const { user, admin } = await makeTenantWithUser("inactive-request", "INACTIVE");
    await passwordResetService.requestPasswordReset(user.email);
    expect(await passwordResetService.listPendingPasswordResetRequests(admin)).toHaveLength(0);
  });

  it("el link generado permite elegir contraseña, atiende la solicitud y sirve una sola vez", async () => {
    const { tenant, user, admin } = await makeTenantWithUser("complete");
    await passwordResetService.requestPasswordReset(user.email);

    const { link, message } = await passwordResetService.createPasswordResetLink(admin, user._id);
    expect(message).toContain(link);
    expect(await passwordResetService.listPendingPasswordResetRequests(admin)).toHaveLength(0);

    const token = tokenFrom(link);
    expect((await passwordResetService.previewPasswordReset(token)).email).toBe(user.email);

    await passwordResetService.completePasswordReset(token, "nueva1234");
    const updated = await userRepository.findById(tenant._id, user._id);
    expect(await bcrypt.compare("nueva1234", updated!.passwordHash!)).toBe(true);

    await expect(passwordResetService.completePasswordReset(token, "otra12345")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("generar un link nuevo invalida el anterior", async () => {
    const { user, admin } = await makeTenantWithUser("replace");
    const first = await passwordResetService.createPasswordResetLink(admin, user._id);
    const second = await passwordResetService.createPasswordResetLink(admin, user._id);

    await expect(passwordResetService.previewPasswordReset(tokenFrom(first.link))).rejects.toBeInstanceOf(NotFoundError);
    await expect(passwordResetService.previewPasswordReset(tokenFrom(second.link))).resolves.toBeTruthy();
  });

  it("un link vencido no sirve", async () => {
    const { user, admin } = await makeTenantWithUser("expired");
    const { link } = await passwordResetService.createPasswordResetLink(admin, user._id);
    const db = await getDb();
    await db.collection("password_resets").updateOne({ tokenHash: hashToken(tokenFrom(link)) }, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    await expect(passwordResetService.completePasswordReset(tokenFrom(link), "nueva1234")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("si la cuenta se desactiva después de generar el link, el link ya no sirve", async () => {
    const { tenant, user, admin } = await makeTenantWithUser("deactivated-later");
    const { link } = await passwordResetService.createPasswordResetLink(admin, user._id);
    await userRepository.updateStatus(tenant._id, user._id, "INACTIVE");

    await expect(passwordResetService.completePasswordReset(tokenFrom(link), "nueva1234")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("no se puede generar un link para una cuenta desactivada", async () => {
    const { user, admin } = await makeTenantWithUser("inactive-link", "INACTIVE");
    await expect(passwordResetService.createPasswordResetLink(admin, user._id)).rejects.toBeInstanceOf(ValidationError);
  });

  it("un admin de otro tenant no puede generar links ni descartar solicitudes ajenas", async () => {
    const { user } = await makeTenantWithUser("cross-a");
    const { admin: otherAdmin } = await makeTenantWithUser("cross-b");
    await passwordResetService.requestPasswordReset(user.email);

    await expect(passwordResetService.createPasswordResetLink(otherAdmin, user._id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(passwordResetService.dismissPasswordResetRequest(otherAdmin, user._id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await passwordResetService.listPendingPasswordResetRequests(otherAdmin)).toHaveLength(0);
  });

  it("si el admin fija la contraseña a mano o desactiva la cuenta, el enlace vivo deja de servir", async () => {
    const { tenant, user, admin } = await makeTenantWithUser("manual-closes-link");
    const first = await passwordResetService.createPasswordResetLink(admin, user._id);
    await userService.resetPassword(admin, user._id, "manual1234");
    await expect(passwordResetService.completePasswordReset(tokenFrom(first.link), "pisada1234")).rejects.toBeInstanceOf(NotFoundError);
    const afterManual = await userRepository.findById(tenant._id, user._id);
    expect(await bcrypt.compare("manual1234", afterManual!.passwordHash!)).toBe(true);

    const second = await passwordResetService.createPasswordResetLink(admin, user._id);
    await userService.deactivateUser(admin, user._id);
    await userService.reactivateUser(admin, user._id);
    await expect(passwordResetService.previewPasswordReset(tokenFrom(second.link))).rejects.toBeInstanceOf(NotFoundError);
  });

  it("descartar saca la solicitud de la lista del admin", async () => {
    const { user, admin } = await makeTenantWithUser("dismiss");
    await passwordResetService.requestPasswordReset(user.email);
    await passwordResetService.dismissPasswordResetRequest(admin, user._id);

    expect(await passwordResetService.listPendingPasswordResetRequests(admin)).toHaveLength(0);
    expect(await passwordResetRepository.findOpenByUser(user.tenantId, user._id)).toBeNull();
  });
});
