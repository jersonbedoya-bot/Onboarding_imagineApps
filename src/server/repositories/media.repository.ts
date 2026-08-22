import { ObjectId } from "mongodb";
import { getDb } from "@/server/db/client";
import type { MediaType } from "@/types/enums";

export type MediaDocument = {
  _id: ObjectId;
  tenantId: ObjectId;
  url: string;
  type: MediaType;
  name: string;
  size: number;
  provider: string;
  uploadedBy: ObjectId;
  createdAt: Date;
};

async function collection() {
  const db = await getDb();
  return db.collection<MediaDocument>("media");
}

export async function create(input: {
  tenantId: ObjectId;
  url: string;
  type: MediaType;
  name: string;
  size: number;
  provider: string;
  uploadedBy: ObjectId;
}): Promise<MediaDocument> {
  const doc: MediaDocument = {
    _id: new ObjectId(),
    tenantId: input.tenantId,
    url: input.url,
    type: input.type,
    name: input.name,
    size: input.size,
    provider: input.provider,
    uploadedBy: input.uploadedBy,
    createdAt: new Date(),
  };
  await (await collection()).insertOne(doc);
  return doc;
}

export async function findById(tenantId: ObjectId, id: ObjectId): Promise<MediaDocument | null> {
  return (await collection()).findOne({ _id: id, tenantId });
}
