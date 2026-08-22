import { ObjectId } from "mongodb";
import { getDb } from "@/server/db/client";

export type AuditAction =
  | "INVITATION_CREATED"
  | "USER_CREATED"
  | "USER_DEACTIVATED"
  | "USER_REACTIVATED"
  | "USER_ROLE_CHANGED";

export type AuditLogDocument = {
  _id: ObjectId;
  tenantId: ObjectId;
  userId: ObjectId;
  action: AuditAction;
  resource: string;
  resourceId: ObjectId;
  metadata: Record<string, unknown>;
  timestamp: Date;
};

async function collection() {
  const db = await getDb();
  return db.collection<AuditLogDocument>("audit_logs");
}

export async function record(input: {
  tenantId: ObjectId;
  userId: ObjectId;
  action: AuditAction;
  resource: string;
  resourceId: ObjectId;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const doc: AuditLogDocument = {
    _id: new ObjectId(),
    tenantId: input.tenantId,
    userId: input.userId,
    action: input.action,
    resource: input.resource,
    resourceId: input.resourceId,
    metadata: input.metadata ?? {},
    timestamp: new Date(),
  };
  await (await collection()).insertOne(doc);
}
