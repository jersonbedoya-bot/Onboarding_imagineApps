import { ObjectId } from "mongodb";
import { getDb } from "@/server/db/client";

export type RoleDocument = {
  _id: ObjectId;
  tenantId: ObjectId;
  // Antes solo tomaba un FunctionalRoleKey (union fija de 2 valores, ver
  // FUNCTIONAL_ROLE_KEYS en types/enums.ts) — eso era exclusivo del seed
  // inicial (scripts/seed-bootstrap.ts), el único lugar que de verdad
  // necesita esos 2 valores concretos. Ningún código de negocio en runtime
  // filtra por `key` (solo por `_id`, ver role.service.ts) — es un
  // identificador interno estable, no una clasificación con significado
  // propio. Ampliar a `string` permite crear roles nuevos desde el panel
  // (ver createRole) sin que un desarrollador tenga que tocar ese enum cada
  // vez; el índice único {tenantId, key} sigue garantizando que no se pisen.
  key: string;
  label: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
};

async function collection() {
  const db = await getDb();
  return db.collection<RoleDocument>("roles");
}

export async function findByKey(tenantId: ObjectId, key: string): Promise<RoleDocument | null> {
  return (await collection()).findOne({ tenantId, key });
}

export async function findById(tenantId: ObjectId, roleId: ObjectId): Promise<RoleDocument | null> {
  return (await collection()).findOne({ _id: roleId, tenantId });
}

export async function listByTenant(tenantId: ObjectId, options?: { includeInactive?: boolean }): Promise<RoleDocument[]> {
  const filter: Record<string, unknown> = { tenantId };
  if (!options?.includeInactive) filter.status = "ACTIVE";
  return (await collection()).find(filter).sort({ key: 1 }).toArray();
}

export async function create(input: { tenantId: ObjectId; key: string; label: string }): Promise<RoleDocument> {
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

export async function updateLabel(tenantId: ObjectId, id: ObjectId, label: string): Promise<RoleDocument | null> {
  return (await collection()).findOneAndUpdate({ _id: id, tenantId }, { $set: { label } }, { returnDocument: "after" });
}

export async function updateStatus(
  tenantId: ObjectId,
  id: ObjectId,
  status: "ACTIVE" | "INACTIVE",
): Promise<RoleDocument | null> {
  return (await collection()).findOneAndUpdate({ _id: id, tenantId }, { $set: { status } }, { returnDocument: "after" });
}
