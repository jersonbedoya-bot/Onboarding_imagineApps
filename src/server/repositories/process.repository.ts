import { ObjectId } from "mongodb";
import { getDb } from "@/server/db/client";
import { omitUndefined } from "@/lib/mongo-patch";
import type { ContentScope, ContentStatus } from "@/types/enums";

export type ProcessDocument = {
  _id: ObjectId;
  tenantId: ObjectId;
  stageId: ObjectId;
  scope: ContentScope;
  roleIds: ObjectId[]; // vacío cuando scope === "COMMON" — mismo patrón que content_items/leaders
  title: string;
  objective: string;
  context: string;
  expectedResult: string;
  resources: string[];
  order: number;
  status: ContentStatus;
  createdAt: Date;
};

async function collection() {
  const db = await getDb();
  return db.collection<ProcessDocument>("processes");
}

export async function create(input: {
  tenantId: ObjectId;
  stageId: ObjectId;
  scope: ContentScope;
  roleIds: ObjectId[];
  title: string;
  objective: string;
  context: string;
  expectedResult: string;
  resources: string[];
  order: number;
}): Promise<ProcessDocument> {
  const doc: ProcessDocument = {
    _id: new ObjectId(),
    tenantId: input.tenantId,
    stageId: input.stageId,
    scope: input.scope,
    roleIds: input.scope === "COMMON" ? [] : input.roleIds,
    title: input.title,
    objective: input.objective,
    context: input.context,
    expectedResult: input.expectedResult,
    resources: input.resources,
    order: input.order,
    status: "DRAFT",
    createdAt: new Date(),
  };
  await (await collection()).insertOne(doc);
  return doc;
}

export async function findById(tenantId: ObjectId, id: ObjectId): Promise<ProcessDocument | null> {
  return (await collection()).findOne({ _id: id, tenantId });
}

export async function listByStage(
  tenantId: ObjectId,
  stageId: ObjectId,
  options?: { status?: ContentStatus },
): Promise<ProcessDocument[]> {
  const filter: Record<string, unknown> = { tenantId, stageId };
  if (options?.status) filter.status = options.status;
  return (await collection()).find(filter).sort({ order: 1, createdAt: 1 }).toArray();
}

export async function update(
  tenantId: ObjectId,
  id: ObjectId,
  patch: Partial<
    Pick<ProcessDocument, "scope" | "roleIds" | "title" | "objective" | "context" | "expectedResult" | "resources" | "order">
  >,
): Promise<ProcessDocument | null> {
  const normalizedPatch = omitUndefined({ ...patch });
  if (normalizedPatch.scope === "COMMON") {
    normalizedPatch.roleIds = [];
  }
  return (await collection()).findOneAndUpdate(
    { _id: id, tenantId },
    { $set: normalizedPatch },
    { returnDocument: "after" },
  );
}

export async function updateStatus(
  tenantId: ObjectId,
  id: ObjectId,
  status: ContentStatus,
): Promise<ProcessDocument | null> {
  return (await collection()).findOneAndUpdate({ _id: id, tenantId }, { $set: { status } }, { returnDocument: "after" });
}

export async function maxOrder(tenantId: ObjectId, stageId: ObjectId): Promise<number> {
  const last = await (await collection()).find({ tenantId, stageId }).sort({ order: -1 }).limit(1).toArray();
  return last[0]?.order ?? 0;
}

// Mismo $or sin índice dedicado que content.repository.findVisibleForRole
// — misma decisión medida (ver comentario ahí y MIGRATIONS.md).
export async function findVisibleForRole(
  tenantId: ObjectId,
  stageIds: ObjectId[],
  roleId: ObjectId,
): Promise<ProcessDocument[]> {
  return (await collection())
    .find({
      tenantId,
      stageId: { $in: stageIds },
      status: "PUBLISHED",
      $or: [{ scope: "COMMON" }, { scope: "ROLE", roleIds: roleId }],
    })
    .sort({ stageId: 1, order: 1, createdAt: 1 })
    .toArray();
}
