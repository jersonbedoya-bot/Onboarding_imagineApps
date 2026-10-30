import type { ObjectId } from "mongodb";
import { NotFoundError, ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";
import * as quizAnswerRepository from "@/server/repositories/quiz-answer.repository";
import { resolveVisibleContent } from "@/server/services/content.service";

function requireRoleId(identity: RequestIdentity): ObjectId {
  if (!identity.functionalRoleId) {
    throw new ValidationError("No tienes un rol funcional asignado.");
  }
  return identity.functionalRoleId;
}

/**
 * Confirma que `contentItemId` es un quiz (`displayFormat: "QUIZ"`)
 * realmente visible para este usuario ahora mismo — mismo criterio de
 * seguridad que `progress.service.markContentAsViewed` (nunca confiar en
 * el id solo, siempre resolver contra lo visible vía `resolveVisibleContent`).
 */
async function assertVisibleQuiz(identity: RequestIdentity, contentItemId: ObjectId) {
  const roleId = requireRoleId(identity);
  const { stages } = await resolveVisibleContent(identity.tenantId, roleId);

  for (const { items } of stages) {
    const item = items.find((i) => i._id.equals(contentItemId));
    if (item) {
      if (item.displayFormat !== "QUIZ") {
        throw new ValidationError("Este content item no es un quiz.");
      }
      return item;
    }
  }
  throw new NotFoundError();
}

/**
 * Se llama apenas el usuario elige una opción (no recién al terminar el
 * quiz) — ver QuizBlock.tsx: cerrar el modal a medio responder no debe
 * perder lo ya contestado, y esto es lo que lo permite.
 */
export async function submitQuizAnswer(
  identity: RequestIdentity,
  contentItemId: ObjectId,
  questionText: string,
  selectedOption: string,
): Promise<void> {
  await assertVisibleQuiz(identity, contentItemId);

  await quizAnswerRepository.upsertAnswer({
    tenantId: identity.tenantId,
    userId: identity.userId,
    contentItemId,
    questionText,
    selectedOption,
  });
}

/** Respuestas ya guardadas de ESTE usuario para retomar el quiz donde quedó (ver QuizBlock.tsx). */
export async function getMyQuizAnswers(
  identity: RequestIdentity,
  contentItemId: ObjectId,
): Promise<{ questionText: string; selectedOption: string }[]> {
  await assertVisibleQuiz(identity, contentItemId);

  const answers = await quizAnswerRepository.findByUserAndContentItem(identity.tenantId, identity.userId, contentItemId);
  return answers.map((a) => ({ questionText: a.questionText, selectedOption: a.selectedOption }));
}

/**
 * Descarta el intento actual de ESTE usuario para reintentar con otras
 * preguntas — solo en quizzes con mínimo de correctas (`quizPassingScore`):
 * sin esto QuizBlock retomaría las respuestas fallidas al reabrir. En un quiz
 * sin mínimo no hay "reprobar", así que no hay nada que reintentar.
 */
export async function restartMyQuiz(identity: RequestIdentity, contentItemId: ObjectId): Promise<void> {
  const item = await assertVisibleQuiz(identity, contentItemId);
  if (!item.quizPassingScore) {
    throw new ValidationError("Este quiz no tiene un mínimo de respuestas correctas: no hace falta reintentarlo.");
  }
  await quizAnswerRepository.deleteByUserAndContentItem(identity.tenantId, identity.userId, contentItemId);
}

export type QuizAnswerListItem = {
  id: string;
  userId: string;
  contentItemId: string;
  questionText: string;
  selectedOption: string;
  answeredAt: Date;
};

/** Listado de control para /admin/quiz-answers — solo lectura, pedido explícito del usuario. */
export async function listQuizAnswers(
  actingAdmin: RequestIdentity,
  filters: { userId?: ObjectId; contentItemId?: ObjectId },
  pagination: { page?: number; pageSize?: number },
): Promise<{ items: QuizAnswerListItem[]; total: number }> {
  const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize = pagination.pageSize && pagination.pageSize > 0 ? pagination.pageSize : 20;

  const { items, total } = await quizAnswerRepository.listByTenant(actingAdmin.tenantId, filters, { page, pageSize });

  return {
    items: items.map((item) => ({
      id: item._id.toString(),
      userId: item.userId.toString(),
      contentItemId: item.contentItemId.toString(),
      questionText: item.questionText,
      selectedOption: item.selectedOption,
      answeredAt: item.answeredAt,
    })),
    total,
  };
}
