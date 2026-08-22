import bcrypt from "bcryptjs";
import { MongoServerError, type ObjectId } from "mongodb";
import { env } from "@/server/config/env";
import { logger } from "@/lib/logger";
import { generateToken, hashToken } from "@/lib/token";
import { normalizeEmail } from "@/lib/email";
import { NotFoundError, ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";
import * as invitationRepository from "@/server/repositories/invitation.repository";
import * as userRepository from "@/server/repositories/user.repository";
import * as roleRepository from "@/server/repositories/role.repository";
import * as tenantRepository from "@/server/repositories/tenant.repository";
import * as auditRepository from "@/server/repositories/audit.repository";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const BCRYPT_COST = 12;
const DUPLICATE_KEY_ERROR_CODE = 11000;

export async function createInvitation(
  actingAdmin: RequestIdentity,
  input: { email: string; functionalRoleId: ObjectId },
) {
  const email = normalizeEmail(input.email);

  const role = await roleRepository.findById(actingAdmin.tenantId, input.functionalRoleId);
  if (!role) {
    throw new ValidationError("El rol funcional no es válido para este tenant.");
  }

  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw new ValidationError("Ya existe una cuenta con ese email.");
  }

  const existingInvitation = await invitationRepository.findExistingActiveByEmail(actingAdmin.tenantId, email);
  if (existingInvitation) {
    throw new ValidationError("Ya existe una invitación pendiente para este email.");
  }

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

  const invitation = await invitationRepository.create({
    tenantId: actingAdmin.tenantId,
    email,
    functionalRoleId: input.functionalRoleId,
    tokenHash,
    expiresAt,
    invitedBy: actingAdmin.userId,
  });

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "INVITATION_CREATED",
    resource: "invitation",
    resourceId: invitation._id,
    metadata: { email, functionalRoleId: input.functionalRoleId.toString() },
  });

  const link = `${env.appUrl}/accept-invite/${rawToken}`;
  const message = `Te invitaron a Imagine Apps como ${role.label}. Activá tu cuenta acá (válido por 7 días): ${link}`;

  return { invitation, link, message };
}

export async function previewInvitation(rawToken: string) {
  const invitation = await invitationRepository.findValidByTokenHash(hashToken(rawToken));
  if (!invitation) {
    throw new NotFoundError("Invitación inválida o expirada.");
  }

  const [tenant, role] = await Promise.all([
    tenantRepository.findById(invitation.tenantId),
    roleRepository.findById(invitation.tenantId, invitation.functionalRoleId),
  ]);

  return {
    email: invitation.email,
    tenantName: tenant?.name ?? "",
    roleLabel: role?.label ?? "",
    expiresAt: invitation.expiresAt,
  };
}

export async function acceptInvitation(rawToken: string, input: { name: string; password: string }) {
  // (a) Validar SIN mutar.
  const invitation = await invitationRepository.findValidByTokenHash(hashToken(rawToken));
  if (!invitation) {
    throw new NotFoundError("Invitación inválida o expirada.");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

  // (b) Crear el user en ACTIVE, con tenantId y rol COPIADOS de la invitación
  // (nunca del form) — la concurrencia de dos accepts simultáneos para el
  // mismo email queda cubierta por el índice único de users.email.
  let user;
  try {
    user = await userRepository.create({
      tenantId: invitation.tenantId,
      email: invitation.email,
      name: input.name,
      passwordHash,
      platformRole: "USER",
      functionalRoleId: invitation.functionalRoleId,
      status: "ACTIVE",
    });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === DUPLICATE_KEY_ERROR_CODE) {
      throw new ValidationError("Ya existe una cuenta con este email.");
    }
    throw error;
  }

  await auditRepository.record({
    tenantId: invitation.tenantId,
    userId: user._id,
    action: "USER_CREATED",
    resource: "user",
    resourceId: user._id,
    metadata: { invitationId: invitation._id.toString() },
  });

  // (c) Recién ahora consumir la invitación. Si esto falla, el user ya
  // existe y puede loguear igual — la invitación simplemente expira sola
  // en vez de dejar a alguien bloqueado.
  const consumed = await invitationRepository.markAccepted(invitation._id);
  if (!consumed) {
    logger.warn("invitation_not_consumed_after_user_created", {
      invitationId: invitation._id.toString(),
      userId: user._id.toString(),
    });
  }

  return { userId: user._id };
}
