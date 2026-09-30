import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import * as tenantRepository from "@/server/repositories/tenant.repository";
import * as roleRepository from "@/server/repositories/role.repository";
import * as userRepository from "@/server/repositories/user.repository";
import * as quizAnswerRepository from "@/server/repositories/quiz-answer.repository";
import { resetOnboarding } from "@/server/services/progress.service";
import type { RequestIdentity } from "@/server/auth/session";

async function makeTenantWithUser(suffix: string) {
  const tenant = await tenantRepository.create({ name: `Tenant ${suffix}`, slug: `tenant-reset-${suffix}` });
  const role = await roleRepository.create({ tenantId: tenant._id, key: "PDM", label: "PDM" });
  const user = await userRepository.create({
    tenantId: tenant._id,
    email: `user-reset-${suffix}@example.com`,
    name: `User ${suffix}`,
    passwordHash: null,
    platformRole: "USER",
    functionalRoleId: role._id,
    status: "ACTIVE",
  });
  return { tenant, user };
}

function actingAdminFor(tenantId: ObjectId): RequestIdentity {
  return { userId: new ObjectId(), tenantId, status: "ACTIVE", platformRole: "ADMIN", functionalRoleId: null };
}

describe("progress.service.resetOnboarding", () => {
  it("borra también las respuestas de quiz, para que no reaparezcan ya contestadas", async () => {
    const { tenant, user } = await makeTenantWithUser("quiz");
    const quizId = new ObjectId();
    await quizAnswerRepository.upsertAnswer({
      tenantId: tenant._id,
      userId: user._id,
      contentItemId: quizId,
      questionText: "¿Pregunta?",
      selectedOption: "Opción",
    });

    const result = await resetOnboarding(actingAdminFor(tenant._id), user._id);

    expect(result.deletedQuizAnswers).toBe(1);
    expect(await quizAnswerRepository.findByUserAndContentItem(tenant._id, user._id, quizId)).toHaveLength(0);
  });

  it("no toca las respuestas de quiz de otra persona", async () => {
    const { tenant, user } = await makeTenantWithUser("other-a");
    const other = await userRepository.create({
      tenantId: tenant._id,
      email: "user-reset-other-b@example.com",
      name: "Otra",
      passwordHash: null,
      platformRole: "USER",
      functionalRoleId: user.functionalRoleId,
      status: "ACTIVE",
    });
    const quizId = new ObjectId();
    await quizAnswerRepository.upsertAnswer({
      tenantId: tenant._id,
      userId: other._id,
      contentItemId: quizId,
      questionText: "¿Pregunta?",
      selectedOption: "Opción",
    });

    await resetOnboarding(actingAdminFor(tenant._id), user._id);

    expect(await quizAnswerRepository.findByUserAndContentItem(tenant._id, other._id, quizId)).toHaveLength(1);
  });
});
