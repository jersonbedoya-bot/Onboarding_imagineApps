import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import * as tenantRepository from "@/server/repositories/tenant.repository";
import * as roleRepository from "@/server/repositories/role.repository";
import * as quizAnswerRepository from "@/server/repositories/quiz-answer.repository";
import * as routeService from "@/server/services/route.service";
import * as stageService from "@/server/services/stage.service";
import * as contentService from "@/server/services/content.service";
import { restartMyQuiz } from "@/server/services/quiz-answer.service";
import { ValidationError } from "@/server/errors";
import { createContentItemSchema, updateContentItemSchema } from "@/server/validation/content.schema";
import type { RequestIdentity } from "@/server/auth/session";

const QUIZ_BODY = "1. ¿Pregunta?\n- Mal\n- **Bien**\n- Mal";

async function setup(suffix: string) {
  const tenant = await tenantRepository.create({ name: `Tenant ${suffix}`, slug: `tenant-quiz-score-${suffix}` });
  const role = await roleRepository.create({ tenantId: tenant._id, key: "DESARROLLO", label: "Desarrollo" });
  const admin: RequestIdentity = { userId: new ObjectId(), tenantId: tenant._id, status: "ACTIVE", platformRole: "ADMIN", functionalRoleId: null };
  await routeService.publishRoute(admin);
  const stage = await stageService.createStage(admin, { title: `Etapa ${suffix}`, isBlocking: true });
  await stageService.publishStage(admin, stage._id);
  const user: RequestIdentity = { userId: new ObjectId(), tenantId: tenant._id, status: "ACTIVE", platformRole: "USER", functionalRoleId: role._id };
  return { tenant, admin, stage, user };
}

async function createQuiz(admin: RequestIdentity, stageId: ObjectId, quizPassingScore: number | null) {
  const quiz = await contentService.createContentItem(admin, {
    stageId,
    type: "TEXT",
    scope: "COMMON",
    roleIds: [],
    title: "Quiz",
    body: QUIZ_BODY,
    requirement: "INFORMATIONAL",
    displayFormat: "QUIZ",
    quizPassingScore,
  });
  await contentService.publishContentItem(admin, quiz._id);
  return quiz;
}

describe("Mínimo de correctas en un quiz (quizPassingScore)", () => {
  it("Zod acota el mínimo a 1..5 (las preguntas de un intento)", () => {
    const base = { stageId: new ObjectId().toString(), type: "TEXT", scope: "COMMON", title: "Quiz", body: QUIZ_BODY, displayFormat: "QUIZ" };
    expect(createContentItemSchema.safeParse({ ...base, quizPassingScore: 4 }).success).toBe(true);
    expect(createContentItemSchema.safeParse({ ...base, quizPassingScore: 6 }).success).toBe(false);
    expect(createContentItemSchema.safeParse({ ...base, quizPassingScore: 0 }).success).toBe(false);
    // Un PATCH que no lo menciona no lo pisa con null (sin .default).
    expect(updateContentItemSchema.parse({ title: "Otro" }).quizPassingScore).toBeUndefined();
  });

  it("solo se guarda en un QUIZ, y se limpia si el contenido deja de serlo", async () => {
    const { admin, stage } = await setup("format");
    const prose = await contentService.createContentItem(admin, {
      stageId: stage._id,
      type: "TEXT",
      scope: "COMMON",
      roleIds: [],
      title: "Texto",
      body: "Hola",
      requirement: "INFORMATIONAL",
      displayFormat: "PROSE",
      quizPassingScore: 4,
    });
    expect(prose.quizPassingScore).toBeNull();

    const quiz = await createQuiz(admin, stage._id, 4);
    expect(quiz.quizPassingScore).toBe(4);

    const asProse = await contentService.updateContentItem(admin, quiz._id, { displayFormat: "PROSE" });
    expect(asProse.quizPassingScore).toBeNull();
  });

  it("un null explícito quita el mínimo; un PATCH que no lo menciona lo conserva", async () => {
    const { admin, stage } = await setup("patch");
    const quiz = await createQuiz(admin, stage._id, 4);

    const renamed = await contentService.updateContentItem(admin, quiz._id, { title: "Quiz renombrado" });
    expect(renamed.quizPassingScore).toBe(4);

    const cleared = await contentService.updateContentItem(admin, quiz._id, { quizPassingScore: null });
    expect(cleared.quizPassingScore).toBeNull();
  });

  it("reintentar borra solo el intento de quien lo pide", async () => {
    const { tenant, admin, stage, user } = await setup("restart");
    const quiz = await createQuiz(admin, stage._id, 4);
    const otherUserId = new ObjectId();
    for (const userId of [user.userId, otherUserId]) {
      await quizAnswerRepository.upsertAnswer({ tenantId: tenant._id, userId, contentItemId: quiz._id, questionText: "¿Pregunta?", selectedOption: "Mal" });
    }

    await restartMyQuiz(user, quiz._id);

    expect(await quizAnswerRepository.findByUserAndContentItem(tenant._id, user.userId, quiz._id)).toHaveLength(0);
    expect(await quizAnswerRepository.findByUserAndContentItem(tenant._id, otherUserId, quiz._id)).toHaveLength(1);
  });

  it("en un quiz sin mínimo no hay reintento (no hay forma de reprobar)", async () => {
    const { admin, stage, user } = await setup("no-min");
    const quiz = await createQuiz(admin, stage._id, null);
    await expect(restartMyQuiz(user, quiz._id)).rejects.toBeInstanceOf(ValidationError);
  });
});
