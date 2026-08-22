import { ObjectId } from "mongodb";
import { getDb } from "@/server/db/client";
import type { ContentItemType, ContentRequirement, ContentScope, ContentStatus } from "@/types/enums";

export type ContentItemDocument = {
  _id: ObjectId;
  tenantId: ObjectId;
  stageId: ObjectId;
  type: ContentItemType;
  scope: ContentScope;
  roleIds: ObjectId[]; // vacío cuando scope === "COMMON"
  title: string;
  body: string;
  requirement: ContentRequirement | null;
  order: number;
  status: ContentStatus;
  createdAt: Date;
};

async function collection() {
  const db = await getDb();
  return db.collection<ContentItemDocument>("content_items");
}

export async function create(input: {
  tenantId: ObjectId;
  stageId: ObjectId;
  type: ContentItemType;
  scope: ContentScope;
  roleIds: ObjectId[];
  title: string;
  body: string;
  requirement: ContentRequirement | null;
  order: number;
}): Promise<ContentItemDocument> {
  const doc: ContentItemDocument = {
    _id: new ObjectId(),
    tenantId: input.tenantId,
    stageId: input.stageId,
    type: input.type,
    scope: input.scope,
    roleIds: input.scope === "COMMON" ? [] : input.roleIds,
    title: input.title,
    body: input.body,
    requirement: input.requirement,
    order: input.order,
    status: "DRAFT",
    createdAt: new Date(),
  };
  await (await collection()).insertOne(doc);
  return doc;
}

export async function findById(tenantId: ObjectId, id: ObjectId): Promise<ContentItemDocument | null> {
  return (await collection()).findOne({ _id: id, tenantId });
}

export async function listByStage(
  tenantId: ObjectId,
  stageId: ObjectId,
  options?: { status?: ContentStatus },
): Promise<ContentItemDocument[]> {
  const filter: Record<string, unknown> = { tenantId, stageId };
  if (options?.status) filter.status = options.status;
  return (await collection()).find(filter).sort({ order: 1, createdAt: 1 }).toArray();
}

export async function update(
  tenantId: ObjectId,
  id: ObjectId,
  patch: Partial<
    Pick<ContentItemDocument, "type" | "scope" | "roleIds" | "title" | "body" | "requirement" | "order">
  >,
): Promise<ContentItemDocument | null> {
  const normalizedPatch = { ...patch };
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
): Promise<ContentItemDocument | null> {
  return (await collection()).findOneAndUpdate({ _id: id, tenantId }, { $set: { status } }, { returnDocument: "after" });
}

export async function maxOrder(tenantId: ObjectId, stageId: ObjectId): Promise<number> {
  const last = await (await collection()).find({ tenantId, stageId }).sort({ order: -1 }).limit(1).toArray();
  return last[0]?.order ?? 0;
}

/**
 * Lectura de visibilidad: contenido PUBLICADO de las etapas dadas, que
 * sea COMMON o ROLE con este roleId incluido. El filtro de rol se hace
 * en la query de Mongo, no post-fetch en JS.
 */
export async function findVisibleForRole(
  tenantId: ObjectId,
  stageIds: ObjectId[],
  roleId: ObjectId,
): Promise<ContentItemDocument[]> {
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
