import { ObjectId } from "mongodb";
import { getDb } from "@/server/db/client";
import type { ContentScope, ContentStatus, VideoProvider } from "@/types/enums";

export type LeaderDocument = {
  _id: ObjectId;
  tenantId: ObjectId;
  name: string;
  title: string;
  description: string;
  photoMediaId: ObjectId | null;
  videoUrl: string | null;
  videoProvider: VideoProvider | null;
  scope: ContentScope;
  roleIds: ObjectId[]; // vacío cuando scope === "COMMON"
  order: number;
  status: ContentStatus;
  createdAt: Date;
};

async function collection() {
  const db = await getDb();
  return db.collection<LeaderDocument>("leaders");
}

export async function create(input: {
  tenantId: ObjectId;
  name: string;
  title: string;
  description: string;
  photoMediaId: ObjectId | null;
  videoUrl: string | null;
  videoProvider: VideoProvider | null;
  scope: ContentScope;
  roleIds: ObjectId[];
  order: number;
}): Promise<LeaderDocument> {
  const doc: LeaderDocument = {
    _id: new ObjectId(),
    tenantId: input.tenantId,
    name: input.name,
    title: input.title,
    description: input.description,
    photoMediaId: input.photoMediaId,
    videoUrl: input.videoUrl,
    videoProvider: input.videoProvider,
    scope: input.scope,
    roleIds: input.scope === "COMMON" ? [] : input.roleIds,
    order: input.order,
    status: "DRAFT",
    createdAt: new Date(),
  };
  await (await collection()).insertOne(doc);
  return doc;
}

export async function findById(tenantId: ObjectId, id: ObjectId): Promise<LeaderDocument | null> {
  return (await collection()).findOne({ _id: id, tenantId });
}

export async function listByTenant(
  tenantId: ObjectId,
  options?: { status?: ContentStatus },
): Promise<LeaderDocument[]> {
  const filter: Record<string, unknown> = { tenantId };
  if (options?.status) filter.status = options.status;
  return (await collection()).find(filter).sort({ order: 1, createdAt: 1 }).toArray();
}

export async function update(
  tenantId: ObjectId,
  id: ObjectId,
  patch: Partial<
    Pick<
      LeaderDocument,
      "name" | "title" | "description" | "photoMediaId" | "videoUrl" | "videoProvider" | "scope" | "roleIds" | "order"
    >
  >,
): Promise<LeaderDocument | null> {
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
): Promise<LeaderDocument | null> {
  return (await collection()).findOneAndUpdate({ _id: id, tenantId }, { $set: { status } }, { returnDocument: "after" });
}

export async function maxOrder(tenantId: ObjectId): Promise<number> {
  const last = await (await collection()).find({ tenantId }).sort({ order: -1 }).limit(1).toArray();
  return last[0]?.order ?? 0;
}

export async function findVisibleForRole(tenantId: ObjectId, roleId: ObjectId): Promise<LeaderDocument[]> {
  return (await collection())
    .find({
      tenantId,
      status: "PUBLISHED",
      $or: [{ scope: "COMMON" }, { scope: "ROLE", roleIds: roleId }],
    })
    .sort({ order: 1, createdAt: 1 })
    .toArray();
}
