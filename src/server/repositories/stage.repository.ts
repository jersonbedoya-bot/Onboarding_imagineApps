import { ObjectId } from "mongodb";
import { getDb } from "@/server/db/client";
import { omitUndefined } from "@/lib/mongo-patch";
import type { ContentStatus } from "@/types/enums";

export type StageDocument = {
  _id: ObjectId;
  tenantId: ObjectId;
  routeId: ObjectId;
  key: string;
  title: string;
  order: number;
  dependsOnStageId: ObjectId | null;
  isBlocking: boolean;
  status: ContentStatus;
  createdAt: Date;
};

async function collection() {
  const db = await getDb();
  return db.collection<StageDocument>("onboarding_stages");
}

export async function create(input: {
  tenantId: ObjectId;
  routeId: ObjectId;
  key: string;
  title: string;
  order: number;
  dependsOnStageId: ObjectId | null;
  isBlocking: boolean;
}): Promise<StageDocument> {
  const doc: StageDocument = {
    _id: new ObjectId(),
    tenantId: input.tenantId,
    routeId: input.routeId,
    key: input.key,
    title: input.title,
    order: input.order,
    dependsOnStageId: input.dependsOnStageId,
    isBlocking: input.isBlocking,
    status: "DRAFT",
    createdAt: new Date(),
  };
  await (await collection()).insertOne(doc);
  return doc;
}

export async function findById(tenantId: ObjectId, stageId: ObjectId): Promise<StageDocument | null> {
  return (await collection()).findOne({ _id: stageId, tenantId });
}

// Orden + desempate determinista por createdAt (dos etapas con el mismo
// `order` manual no deben devolver un orden distinto en cada lectura).
export async function listByRoute(
  tenantId: ObjectId,
  routeId: ObjectId,
  options?: { status?: ContentStatus },
): Promise<StageDocument[]> {
  const filter: Record<string, unknown> = { tenantId, routeId };
  if (options?.status) filter.status = options.status;
  return (await collection()).find(filter).sort({ order: 1, createdAt: 1 }).toArray();
}

export async function update(
  tenantId: ObjectId,
  stageId: ObjectId,
  patch: Partial<Pick<StageDocument, "title" | "order" | "dependsOnStageId" | "isBlocking">>,
): Promise<StageDocument | null> {
  return (await collection()).findOneAndUpdate({ _id: stageId, tenantId }, { $set: omitUndefined(patch) }, { returnDocument: "after" });
}

export async function updateStatus(
  tenantId: ObjectId,
  stageId: ObjectId,
  status: ContentStatus,
): Promise<StageDocument | null> {
  return (await collection()).findOneAndUpdate(
    { _id: stageId, tenantId },
    { $set: { status } },
    { returnDocument: "after" },
  );
}

/** Borrado permanente — solo debe llamarse tras validar en el Service que la etapa está ARCHIVED y sin hijos. */
export async function remove(tenantId: ObjectId, stageId: ObjectId): Promise<boolean> {
  const result = await (await collection()).deleteOne({ _id: stageId, tenantId });
  return result.deletedCount === 1;
}

export async function maxOrder(tenantId: ObjectId, routeId: ObjectId): Promise<number> {
  const last = await (await collection())
    .find({ tenantId, routeId })
    .sort({ order: -1 })
    .limit(1)
    .toArray();
  return last[0]?.order ?? 0;
}
