import { ObjectId } from "mongodb";
import { getDb } from "@/server/db/client";
import type { ContentStatus } from "@/types/enums";

export type RouteDocument = {
  _id: ObjectId;
  tenantId: ObjectId;
  name: string;
  status: ContentStatus;
  createdAt: Date;
  // Título/subtítulo del header de /onboarding (Bloque X) — opcionales:
  // documentos creados antes de este campo simplemente no lo traen, y el
  // caller (route.service.getRouteHeader) resuelve el default. No hay
  // validador $jsonSchema para esta colección (ver schema.ts), así que
  // agregarlos no requiere migración de Mongo.
  headline?: string | null;
  subtitle?: string | null;
};

async function collection() {
  const db = await getDb();
  return db.collection<RouteDocument>("onboarding_routes");
}

export async function findByTenant(tenantId: ObjectId): Promise<RouteDocument | null> {
  return (await collection()).findOne({ tenantId });
}

/**
 * Upsert atómico: si dos requests concurrentes disparan la creación
 * perezosa de la ruta del mismo tenant, el índice único {tenantId}
 * garantiza que solo una gana el insert — la otra simplemente lee el
 * documento que la primera acaba de crear. `wasCreated` distingue los
 * dos casos para la auditoría (ROUTE_CREATED solo en el primero).
 */
export async function getOrCreate(tenantId: ObjectId, name: string): Promise<{ route: RouteDocument; wasCreated: boolean }> {
  const result = await (await collection()).findOneAndUpdate(
    { tenantId },
    {
      $setOnInsert: {
        _id: new ObjectId(),
        tenantId,
        name,
        status: "DRAFT" as ContentStatus,
        createdAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after", includeResultMetadata: true },
  );

  const route = result.value as RouteDocument;
  const wasCreated = result.lastErrorObject?.updatedExisting === false;
  return { route, wasCreated };
}

export async function updateStatus(tenantId: ObjectId, status: ContentStatus): Promise<RouteDocument | null> {
  return (await collection()).findOneAndUpdate({ tenantId }, { $set: { status } }, { returnDocument: "after" });
}

export async function updateContent(
  tenantId: ObjectId,
  patch: { headline?: string | null; subtitle?: string | null },
): Promise<RouteDocument | null> {
  return (await collection()).findOneAndUpdate({ tenantId }, { $set: patch }, { returnDocument: "after" });
}
