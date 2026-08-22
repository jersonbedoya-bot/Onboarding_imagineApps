import { ObjectId } from "mongodb";
import { getDb } from "@/server/db/client";

export type TenantDocument = {
  _id: ObjectId;
  name: string;
  slug: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
};

async function collection() {
  const db = await getDb();
  return db.collection<TenantDocument>("tenants");
}

export async function findBySlug(slug: string): Promise<TenantDocument | null> {
  return (await collection()).findOne({ slug });
}

export async function create(input: { name: string; slug: string }): Promise<TenantDocument> {
  const doc: TenantDocument = {
    _id: new ObjectId(),
    name: input.name,
    slug: input.slug,
    status: "ACTIVE",
    createdAt: new Date(),
  };
  await (await collection()).insertOne(doc);
  return doc;
}
