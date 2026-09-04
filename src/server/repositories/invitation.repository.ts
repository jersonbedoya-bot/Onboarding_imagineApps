import { ObjectId } from "mongodb";
import { getDb } from "@/server/db/client";
import { normalizeEmail } from "@/lib/email";
import type { InvitationStatus, PlatformRole } from "@/types/enums";

export type InvitationDocument = {
  _id: ObjectId;
  tenantId: ObjectId;
  email: string;
  platformRole: PlatformRole;
  functionalRoleId: ObjectId | null; // null cuando platformRole === "ADMIN"
  tokenHash: string;
  status: InvitationStatus;
  expiresAt: Date;
  acceptedAt: Date | null;
  invitedBy: ObjectId;
  createdAt: Date;
};

async function collection() {
  const db = await getDb();
  return db.collection<InvitationDocument>("invitations");
}

export async function create(input: {
  tenantId: ObjectId;
  email: string;
  platformRole: PlatformRole;
  functionalRoleId: ObjectId | null;
  tokenHash: string;
  expiresAt: Date;
  invitedBy: ObjectId;
}): Promise<InvitationDocument> {
  const doc: InvitationDocument = {
    _id: new ObjectId(),
    tenantId: input.tenantId,
    email: normalizeEmail(input.email),
    platformRole: input.platformRole,
    functionalRoleId: input.functionalRoleId,
    tokenHash: input.tokenHash,
    status: "PENDING",
    expiresAt: input.expiresAt,
    acceptedAt: null,
    invitedBy: input.invitedBy,
    createdAt: new Date(),
  };
  await (await collection()).insertOne(doc);
  return doc;
}

/**
 * Lectura, sin mutar — para previsualizar la invitación (a qué tenant/rol
 * corresponde) antes de que el invitado envíe el form de aceptación.
 */
export async function findValidByTokenHash(tokenHash: string): Promise<InvitationDocument | null> {
  return (await collection()).findOne({
    tokenHash,
    status: "PENDING",
    expiresAt: { $gt: new Date() },
  });
}

/**
 * Consumo atómico: PENDING -> ACCEPTED. Se llama DESPUÉS de crear el user
 * (ver invitation.service.acceptInvitation) para que un fallo acá nunca
 * deje a alguien con user creado pero sin poder loguear.
 */
export async function markAccepted(invitationId: ObjectId): Promise<InvitationDocument | null> {
  const result = await (await collection()).findOneAndUpdate(
    { _id: invitationId, status: "PENDING" },
    { $set: { status: "ACCEPTED", acceptedAt: new Date() } },
    { returnDocument: "after" },
  );
  return result;
}

export async function findExistingActiveByEmail(tenantId: ObjectId, email: string): Promise<InvitationDocument | null> {
  return (await collection()).findOne({
    tenantId,
    email: normalizeEmail(email),
    status: "PENDING",
    expiresAt: { $gt: new Date() },
  });
}

/**
 * Todas las invitaciones del tenant, más recientes primero — para la
 * pantalla de control de /admin/users (ver invitation.service.listInvitations).
 * Solo lectura: no hay acción de revocar/reenviar todavía (ver BACKLOG.md).
 */
export async function listByTenant(tenantId: ObjectId): Promise<InvitationDocument[]> {
  return (await collection()).find({ tenantId }).sort({ createdAt: -1 }).toArray();
}
