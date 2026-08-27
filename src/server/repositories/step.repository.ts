import { ObjectId } from "mongodb";
import { getDb } from "@/server/db/client";
import { omitUndefined } from "@/lib/mongo-patch";
import type { ContentStatus, VideoProvider } from "@/types/enums";

export type StepDocument = {
  _id: ObjectId;
  tenantId: ObjectId;
  processId: ObjectId;
  title: string;
  description: string;
  instruction: string;
  resources: string[];
  videoUrl: string | null;
  videoProvider: VideoProvider | null;
  links: string[];
  completionCriteria: string;
  order: number;
  status: ContentStatus;
  createdAt: Date;
};

async function collection() {
  const db = await getDb();
  return db.collection<StepDocument>("process_steps");
}

export async function create(input: {
  tenantId: ObjectId;
  processId: ObjectId;
  title: string;
  description: string;
  instruction: string;
  resources: string[];
  videoUrl: string | null;
  videoProvider: VideoProvider | null;
  links: string[];
  completionCriteria: string;
  order: number;
}): Promise<StepDocument> {
  const doc: StepDocument = {
    _id: new ObjectId(),
    tenantId: input.tenantId,
    processId: input.processId,
    title: input.title,
    description: input.description,
    instruction: input.instruction,
    resources: input.resources,
    videoUrl: input.videoUrl,
    videoProvider: input.videoProvider,
    links: input.links,
    completionCriteria: input.completionCriteria,
    order: input.order,
    status: "DRAFT",
    createdAt: new Date(),
  };
  await (await collection()).insertOne(doc);
  return doc;
}

export async function findById(tenantId: ObjectId, id: ObjectId): Promise<StepDocument | null> {
  return (await collection()).findOne({ _id: id, tenantId });
}

export async function listByProcess(
  tenantId: ObjectId,
  processId: ObjectId,
  options?: { status?: ContentStatus },
): Promise<StepDocument[]> {
  const filter: Record<string, unknown> = { tenantId, processId };
  if (options?.status) filter.status = options.status;
  return (await collection()).find(filter).sort({ order: 1, createdAt: 1 }).toArray();
}

export async function update(
  tenantId: ObjectId,
  id: ObjectId,
  patch: Partial<
    Pick<StepDocument, "title" | "description" | "instruction" | "resources" | "videoUrl" | "videoProvider" | "links" | "completionCriteria" | "order">
  >,
): Promise<StepDocument | null> {
  return (await collection()).findOneAndUpdate({ _id: id, tenantId }, { $set: omitUndefined(patch) }, { returnDocument: "after" });
}

export async function updateStatus(
  tenantId: ObjectId,
  id: ObjectId,
  status: ContentStatus,
): Promise<StepDocument | null> {
  return (await collection()).findOneAndUpdate({ _id: id, tenantId }, { $set: { status } }, { returnDocument: "after" });
}

/** Borrado permanente — solo debe llamarse tras validar en el Service que el paso está ARCHIVED. */
export async function remove(tenantId: ObjectId, id: ObjectId): Promise<boolean> {
  const result = await (await collection()).deleteOne({ _id: id, tenantId });
  return result.deletedCount === 1;
}

export async function maxOrder(tenantId: ObjectId, processId: ObjectId): Promise<number> {
  const last = await (await collection()).find({ tenantId, processId }).sort({ order: -1 }).limit(1).toArray();
  return last[0]?.order ?? 0;
}

export async function listPublishedByProcesses(tenantId: ObjectId, processIds: ObjectId[]): Promise<StepDocument[]> {
  return (await collection())
    .find({ tenantId, processId: { $in: processIds }, status: "PUBLISHED" })
    .sort({ processId: 1, order: 1, createdAt: 1 })
    .toArray();
}
