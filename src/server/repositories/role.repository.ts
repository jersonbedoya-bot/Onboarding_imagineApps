import { ObjectId } from "mongodb";
import { getDb } from "@/server/db/client";
import type { FunctionalRoleKey } from "@/types/enums";

export type RoleDocument = {
  _id: ObjectId;
  tenantId: ObjectId;
  key: FunctionalRoleKey;
  label: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
};

async function collection() {
  const db = await getDb();
  return db.collection<RoleDocument>("roles");
}

export async function findByKey(tenantId: ObjectId, key: FunctionalRoleKey): Promise<RoleDocument | null> {
  return (await collection()).findOne({ tenantId, key });
}

export async function create(input: {
  tenantId: ObjectId;
  key: FunctionalRoleKey;
  label: string;
}): Promise<RoleDocument> {
  const doc: RoleDocument = {
    _id: new ObjectId(),
    tenantId: input.tenantId,
    key: input.key,
    label: input.label,
    status: "ACTIVE",
    createdAt: new Date(),
  };
  await (await collection()).insertOne(doc);
  return doc;
}
