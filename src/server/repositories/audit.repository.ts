import { ObjectId } from "mongodb";
import { getDb } from "@/server/db/client";

// Array en runtime (no solo tipo) para poder validar el filtro `action`
// que llega por query param en GET /api/audit — ver audit.schema.ts.
export const AUDIT_ACTIONS = [
  "INVITATION_CREATED",
  "USER_CREATED",
  "USER_DEACTIVATED",
  "USER_REACTIVATED",
  "USER_ROLE_CHANGED",
  "USER_PLATFORM_ROLE_CHANGED",
  "ROUTE_CREATED",
  "ROUTE_UPDATED",
  "ROUTE_PUBLISHED",
  "ROUTE_ARCHIVED",
  "ROUTE_REACTIVATED",
  "STAGE_CREATED",
  "STAGE_UPDATED",
  "STAGE_PUBLISHED",
  "STAGE_ARCHIVED",
  "STAGE_REACTIVATED",
  "STAGE_DELETED",
  "CONTENT_CREATED",
  "CONTENT_UPDATED",
  "CONTENT_PUBLISHED",
  "CONTENT_ARCHIVED",
  "CONTENT_REACTIVATED",
  "CONTENT_DELETED",
  "LEADER_CREATED",
  "LEADER_UPDATED",
  "LEADER_PUBLISHED",
  "LEADER_ARCHIVED",
  "LEADER_REACTIVATED",
  "LEADER_DELETED",
  "PROCESS_CREATED",
  "PROCESS_UPDATED",
  "PROCESS_PUBLISHED",
  "PROCESS_ARCHIVED",
  "PROCESS_REACTIVATED",
  "PROCESS_DELETED",
  "STEP_CREATED",
  "STEP_UPDATED",
  "STEP_PUBLISHED",
  "STEP_ARCHIVED",
  "STEP_REACTIVATED",
  "STEP_DELETED",
  "MEDIA_UPLOADED",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

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

/**
 * Lectura paginada para /admin/audit. El filtro se arma solo con las
 * claves presentes: según cuáles vengan, Mongo elige entre
 * {tenantId,timestamp}, {tenantId,userId,timestamp} o
 * {tenantId,action,timestamp} (ver explain() en Fase 5 / MIGRATIONS.md —
 * los 3 índices están pensados exactamente para estas combinaciones).
 */
export async function listByTenant(
  tenantId: ObjectId,
  filters: { userId?: ObjectId; action?: AuditAction; from?: Date; to?: Date },
  pagination: { page: number; pageSize: number },
): Promise<{ items: AuditLogDocument[]; total: number }> {
  const filter: Record<string, unknown> = { tenantId };
  if (filters.userId) filter.userId = filters.userId;
  if (filters.action) filter.action = filters.action;
  if (filters.from || filters.to) {
    filter.timestamp = {
      ...(filters.from ? { $gte: filters.from } : {}),
      ...(filters.to ? { $lte: filters.to } : {}),
    };
  }

  const skip = (pagination.page - 1) * pagination.pageSize;
  const col = await collection();

  const [items, total] = await Promise.all([
    col.find(filter).sort({ timestamp: -1 }).skip(skip).limit(pagination.pageSize).toArray(),
    col.countDocuments(filter),
  ]);

  return { items, total };
}
