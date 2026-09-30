import { ObjectId } from "mongodb";
import { getDb } from "@/server/db/client";

export type QuizAnswerDocument = {
  _id: ObjectId;
  tenantId: ObjectId;
  userId: ObjectId;
  contentItemId: ObjectId;
  questionText: string;
  selectedOption: string;
  answeredAt: Date;
};

async function collection() {
  const db = await getDb();
  return db.collection<QuizAnswerDocument>("quiz_answers");
}

/**
 * Upsert por pregunta (clave: questionText, ver schema.ts) — se llama
 * apenas se elige una opción, no recién al terminar el quiz, para que
 * cerrar el modal a medio responder no pierda lo ya contestado.
 */
export async function upsertAnswer(input: {
  tenantId: ObjectId;
  userId: ObjectId;
  contentItemId: ObjectId;
  questionText: string;
  selectedOption: string;
}): Promise<void> {
  await (await collection()).updateOne(
    { tenantId: input.tenantId, userId: input.userId, contentItemId: input.contentItemId, questionText: input.questionText },
    { $set: { selectedOption: input.selectedOption, answeredAt: new Date() } },
    { upsert: true },
  );
}

/** Respuestas YA guardadas de este usuario para este quiz — para retomarlo donde quedó. */
export async function findByUserAndContentItem(
  tenantId: ObjectId,
  userId: ObjectId,
  contentItemId: ObjectId,
): Promise<QuizAnswerDocument[]> {
  return (await collection()).find({ tenantId, userId, contentItemId }).toArray();
}

/** Todas las respuestas de un usuario — usado por progress.service.resetOnboarding. */
export async function deleteAllForUser(tenantId: ObjectId, userId: ObjectId): Promise<number> {
  const result = await (await collection()).deleteMany({ tenantId, userId });
  return result.deletedCount;
}

/** Listado de control para el admin (ver quiz-answer.service.listQuizAnswers) — más recientes primero. */
export async function listByTenant(
  tenantId: ObjectId,
  filters: { userId?: ObjectId; contentItemId?: ObjectId },
  pagination: { page: number; pageSize: number },
): Promise<{ items: QuizAnswerDocument[]; total: number }> {
  const filter: Record<string, unknown> = { tenantId };
  if (filters.userId) filter.userId = filters.userId;
  if (filters.contentItemId) filter.contentItemId = filters.contentItemId;

  const skip = (pagination.page - 1) * pagination.pageSize;
  const col = await collection();

  const [items, total] = await Promise.all([
    col.find(filter).sort({ answeredAt: -1 }).skip(skip).limit(pagination.pageSize).toArray(),
    col.countDocuments(filter),
  ]);

  return { items, total };
}
