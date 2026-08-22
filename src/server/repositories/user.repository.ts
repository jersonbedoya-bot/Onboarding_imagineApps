import { ObjectId } from "mongodb";
import { getDb } from "@/server/db/client";
import { normalizeEmail } from "@/lib/email";
import type { PlatformRole, UserStatus } from "@/types/enums";

export type UserDocument = {
  _id: ObjectId;
  tenantId: ObjectId;
  email: string;
  name: string;
  passwordHash: string | null;
  platformRole: PlatformRole;
  functionalRoleId: ObjectId | null;
  status: UserStatus;
  createdAt: Date;
};

export type UserAuthContext = {
  status: UserStatus;
  platformRole: PlatformRole;
  functionalRoleId: ObjectId | null;
};

async function collection() {
  const db = await getDb();
  return db.collection<UserDocument>("users");
}

export async function findByEmail(email: string): Promise<UserDocument | null> {
  return (await collection()).findOne({ email: normalizeEmail(email) });
}

/**
 * Read liviano usado por requireActiveUser en cada request protegida:
 * solo los campos de autoridad, nunca el documento completo (evita
 * traer passwordHash a memoria fuera del flujo de login).
 */
export async function findAuthContextById(id: ObjectId): Promise<UserAuthContext | null> {
  return (await collection()).findOne(
    { _id: id },
    { projection: { status: 1, platformRole: 1, functionalRoleId: 1, _id: 0 } },
  ) as Promise<UserAuthContext | null>;
}

export async function create(input: {
  tenantId: ObjectId;
  email: string;
  name: string;
  passwordHash: string | null;
  platformRole: PlatformRole;
  functionalRoleId: ObjectId | null;
  status: UserStatus;
}): Promise<UserDocument> {
  const doc: UserDocument = {
    _id: new ObjectId(),
    tenantId: input.tenantId,
    email: normalizeEmail(input.email),
    name: input.name,
    passwordHash: input.passwordHash,
    platformRole: input.platformRole,
    functionalRoleId: input.functionalRoleId,
    status: input.status,
    createdAt: new Date(),
  };
  await (await collection()).insertOne(doc);
  return doc;
}
