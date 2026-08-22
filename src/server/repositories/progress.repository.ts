import { ObjectId } from "mongodb";
import { getDb } from "@/server/db/client";
import type { ProgressTargetType } from "@/types/enums";

export type ProgressDocument = {
  _id: ObjectId;
  tenantId: ObjectId;
  userId: ObjectId;
  targetType: ProgressTargetType;
  targetId: ObjectId;
  stageId: ObjectId;
  processId: ObjectId | null;
  completedAt: Date;
};

async function collection() {
  const db = await getDb();
  return db.collection<ProgressDocument>("user_progress");
}

/**
 * Idempotente: $setOnInsert nunca pisa un completedAt ya existente, así
 * que reintentar sobre algo ya completado es un no-op silencioso (no
 * error), como pide el flujo de completar pasos/contenido.
 */
export async function upsertCompletion(input: {
  tenantId: ObjectId;
  userId: ObjectId;
  targetType: ProgressTargetType;
  targetId: ObjectId;
  stageId: ObjectId;
  processId?: ObjectId | null;
}): Promise<ProgressDocument> {
  const result = await (await collection()).findOneAndUpdate(
    { tenantId: input.tenantId, userId: input.userId, targetType: input.targetType, targetId: input.targetId },
    {
      $setOnInsert: {
        _id: new ObjectId(),
        tenantId: input.tenantId,
        userId: input.userId,
        targetType: input.targetType,
        targetId: input.targetId,
        stageId: input.stageId,
        processId: input.processId ?? null,
        completedAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after", includeResultMetadata: true },
  );

  return result.value as ProgressDocument;
}

export async function findByUser(tenantId: ObjectId, userId: ObjectId): Promise<ProgressDocument[]> {
  return (await collection()).find({ tenantId, userId }).toArray();
}

export async function findOne(
  tenantId: ObjectId,
  userId: ObjectId,
  targetType: ProgressTargetType,
  targetId: ObjectId,
): Promise<ProgressDocument | null> {
  return (await collection()).findOne({ tenantId, userId, targetType, targetId });
}
