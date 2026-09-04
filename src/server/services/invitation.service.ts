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
import type { PlatformRole, InvitationStatus } from "@/types/enums";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const BCRYPT_COST = 12;
const DUPLICATE_KEY_ERROR_CODE = 11000;

export async function createInvitation(
  actingAdmin: RequestIdentity,
  input: { email: string; platformRole?: PlatformRole; functionalRoleId?: ObjectId },
) {
  const email = normalizeEmail(input.email);
  const platformRole = input.platformRole ?? "USER";

  let roleLabel = platformRole === "ADMIN" ? "Administrador" : "Editor";
  if (platformRole === "USER") {
    if (!input.functionalRoleId) {
      throw new ValidationError("Un usuario necesita un rol funcional.");
    }
    const role = await roleRepository.findById(actingAdmin.tenantId, input.functionalRoleId);
    if (!role) {
      throw new ValidationError("El rol funcional no es válido para este tenant.");
    }
    roleLabel = role.label;
  } else if (input.functionalRoleId) {
    throw new ValidationError("Editores y administradores no tienen rol funcional.");
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
    platformRole,
    functionalRoleId: platformRole === "USER" ? (input.functionalRoleId ?? null) : null,
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
    metadata: { email, platformRole, functionalRoleId: input.functionalRoleId?.toString() ?? null },
  });

  const link = `${env.appUrl}/accept-invite/${rawToken}`;
  const message = `Te invitaron a Imagine Apps como ${roleLabel}. Activá tu cuenta acá (válido por 7 días): ${link}`;

  return { invitation, link, message };
}

/**
 * `status` en Mongo solo se mueve PENDING -> ACCEPTED (ver markAccepted);
 * nada pasa una invitación vencida a EXPIRED, así que a los 7 días sigue
 * diciendo "PENDING" aunque ya no sirva para nada — se calcula acá en vez
 * de confiar en el campo guardado (mismo criterio que progress-derivation.ts:
 * el dato derivado nunca vive como verdad guardada si puede quedar
 * desactualizado sin que nada lo toque).
 */
function effectiveInvitationStatus(invitation: invitationRepository.InvitationDocument): InvitationStatus {
  if (invitation.status === "PENDING" && invitation.expiresAt.getTime() <= Date.now()) return "EXPIRED";
  return invitation.status;
}

export type InvitationListItem = {
  id: string;
  email: string;
  platformRole: PlatformRole;
  functionalRoleId: string | null;
  status: InvitationStatus;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  invitedBy: string;
};

/**
 * Listado de control para /admin/users (ver InvitationsList.tsx) — el
 * usuario pidió esto después de perder el link de una invitación ya creada
 * y no tener forma de ver que había quedado pendiente. Solo lectura: no
 * agrega revocar/reenviar, que sigue diferido en BACKLOG.md.
 */
export async function listInvitations(actingAdmin: RequestIdentity): Promise<InvitationListItem[]> {
  const invitations = await invitationRepository.listByTenant(actingAdmin.tenantId);
  return invitations.map((invitation) => ({
    id: invitation._id.toString(),
    email: invitation.email,
    platformRole: invitation.platformRole,
    functionalRoleId: invitation.functionalRoleId?.toString() ?? null,
    status: effectiveInvitationStatus(invitation),
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    invitedBy: invitation.invitedBy.toString(),
  }));
}

export async function previewInvitation(rawToken: string) {
  const invitation = await invitationRepository.findValidByTokenHash(hashToken(rawToken));
  if (!invitation) {
    throw new NotFoundError("Invitación inválida o expirada.");
  }

  const [tenant, role] = await Promise.all([
    tenantRepository.findById(invitation.tenantId),
    invitation.functionalRoleId ? roleRepository.findById(invitation.tenantId, invitation.functionalRoleId) : null,
  ]);

  return {
    email: invitation.email,
    tenantName: tenant?.name ?? "",
    roleLabel: invitation.platformRole === "ADMIN" ? "Administrador" : invitation.platformRole === "EDITOR" ? "Editor" : (role?.label ?? ""),
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
      platformRole: invitation.platformRole,
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
