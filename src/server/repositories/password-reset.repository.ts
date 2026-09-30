import { ObjectId } from "mongodb";
import { getDb } from "@/server/db/client";

export type PasswordResetStatus = "REQUESTED" | "LINK_CREATED" | "USED" | "DISMISSED";

export type PasswordResetDocument = {
  _id: ObjectId;
  tenantId: ObjectId;
  userId: ObjectId;
  status: PasswordResetStatus;
  requestedAt: Date | null; // null si el admin generó el link sin que nadie lo pidiera
  tokenHash: string | null;
  expiresAt: Date | null;
  linkCreatedBy: ObjectId | null;
  linkCreatedAt: Date | null;
  usedAt: Date | null;
  createdAt: Date;
};

async function collection() {
  const db = await getDb();
  return db.collection<PasswordResetDocument>("password_resets");
}

const OPEN_STATUSES: PasswordResetStatus[] = ["REQUESTED", "LINK_CREATED"];

/** La solicitud abierta (REQUESTED o LINK_CREATED) de esta persona, si hay. */
export async function findOpenByUser(tenantId: ObjectId, userId: ObjectId): Promise<PasswordResetDocument | null> {
  return (await collection()).findOne({ tenantId, userId, status: { $in: OPEN_STATUSES } }, { sort: { createdAt: -1 } });
}

export async function createRequest(tenantId: ObjectId, userId: ObjectId): Promise<PasswordResetDocument> {
  const now = new Date();
  const doc: PasswordResetDocument = {
    _id: new ObjectId(),
    tenantId,
    userId,
    status: "REQUESTED",
    requestedAt: now,
    tokenHash: null,
    expiresAt: null,
    linkCreatedBy: null,
    linkCreatedAt: null,
    usedAt: null,
    createdAt: now,
  };
  await (await collection()).insertOne(doc);
  return doc;
}

/** Repetir la solicitud no duplica: solo refresca la fecha, para que suba en la lista del admin. */
export async function touchRequest(id: ObjectId): Promise<void> {
  await (await collection()).updateOne({ _id: id }, { $set: { requestedAt: new Date() } });
}

/**
 * Deja un solo link vivo por persona: cierra como DISMISSED cualquier
 * solicitud/link abierto anterior y crea el nuevo, conservando la fecha de
 * la solicitud original (si la hubo) para que el admin sepa qué atendió.
 */
export async function createLink(input: {
  tenantId: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdBy: ObjectId;
}): Promise<PasswordResetDocument> {
  const col = await collection();
  const previous = await col.findOne(
    { tenantId: input.tenantId, userId: input.userId, status: { $in: OPEN_STATUSES } },
    { sort: { createdAt: -1 } },
  );
  await col.updateMany(
    { tenantId: input.tenantId, userId: input.userId, status: { $in: OPEN_STATUSES } },
    { $set: { status: "DISMISSED" } },
  );
  const now = new Date();
  const doc: PasswordResetDocument = {
    _id: new ObjectId(),
    tenantId: input.tenantId,
    userId: input.userId,
    status: "LINK_CREATED",
    requestedAt: previous?.requestedAt ?? null,
    tokenHash: input.tokenHash,
    expiresAt: input.expiresAt,
    linkCreatedBy: input.createdBy,
    linkCreatedAt: now,
    usedAt: null,
    createdAt: now,
  };
  await col.insertOne(doc);
  return doc;
}

/** Lectura sin mutar — para mostrar el formulario de /reset-password/[token]. */
export async function findValidByTokenHash(tokenHash: string): Promise<PasswordResetDocument | null> {
  return (await collection()).findOne({ tokenHash, status: "LINK_CREATED", expiresAt: { $gt: new Date() } });
}

/**
 * Consumo atómico LINK_CREATED -> USED: dos envíos simultáneos del mismo
 * link no pueden usarlo dos veces (el segundo no matchea y recibe null).
 */
export async function consume(tokenHash: string): Promise<PasswordResetDocument | null> {
  return (await collection()).findOneAndUpdate(
    { tokenHash, status: "LINK_CREATED", expiresAt: { $gt: new Date() } },
    { $set: { status: "USED", usedAt: new Date() } },
    { returnDocument: "after" },
  );
}

/** Descarta la solicitud abierta de una persona (el admin la resolvió por otro lado). */
export async function dismissOpenForUser(tenantId: ObjectId, userId: ObjectId): Promise<number> {
  const result = await (await collection()).updateMany(
    { tenantId, userId, status: { $in: OPEN_STATUSES } },
    { $set: { status: "DISMISSED" } },
  );
  return result.modifiedCount;
}

/** Solicitudes que esperan que un admin genere el link — las que ve /admin/users. */
export async function listRequestedByTenant(tenantId: ObjectId): Promise<PasswordResetDocument[]> {
  return (await collection()).find({ tenantId, status: "REQUESTED" }).sort({ requestedAt: -1 }).toArray();
}

export async function countRequestedByTenant(tenantId: ObjectId): Promise<number> {
  return (await collection()).countDocuments({ tenantId, status: "REQUESTED" });
}
