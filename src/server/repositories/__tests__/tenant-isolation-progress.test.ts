import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import * as tenantRepository from "@/server/repositories/tenant.repository";
import * as roleRepository from "@/server/repositories/role.repository";
import * as routeService from "@/server/services/route.service";
import * as stageService from "@/server/services/stage.service";
import * as contentService from "@/server/services/content.service";
import * as processService from "@/server/services/process.service";
import * as stepService from "@/server/services/step.service";
import * as progressService from "@/server/services/progress.service";
import * as progressRepository from "@/server/repositories/progress.repository";
import { NotFoundError, ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";

async function makeTenantWithPublishedStage(suffix: string) {
  const tenant = await tenantRepository.create({ name: `Tenant ${suffix}`, slug: `tenant-progress-${suffix}` });
  const role = await roleRepository.create({ tenantId: tenant._id, key: "PDM", label: "PDM" });
  const admin: RequestIdentity = {
    userId: new ObjectId(),
    tenantId: tenant._id,
    status: "ACTIVE",
    platformRole: "ADMIN",
    functionalRoleId: null,
  };

  await routeService.publishRoute(admin);
  const stage = await stageService.createStage(admin, { title: `Etapa ${suffix}`, isBlocking: true });
  await stageService.publishStage(admin, stage._id);

  const user: RequestIdentity = {
    userId: new ObjectId(),
    tenantId: tenant._id,
    status: "ACTIVE",
    platformRole: "USER",
    functionalRoleId: role._id,
  };

  return { tenant, role, admin, stage, user };
}

async function createAndPublishObligatoryContent(admin: RequestIdentity, stageId: ObjectId, title: string) {
  const item = await contentService.createContentItem(admin, {
    stageId,
    type: "TEXT",
    scope: "COMMON",
    roleIds: [],
    title,
    body: "cuerpo",
    requirement: "OBLIGATORY",
  });
  await contentService.publishContentItem(admin, item._id);
  return item;
}

async function createAndPublishStep(admin: RequestIdentity, stageId: ObjectId, title: string) {
  const process = await processService.createProcess(admin, {
    stageId,
    scope: "COMMON",
    roleIds: [],
    title: `Proceso para ${title}`,
    objective: "",
    context: "",
    expectedResult: "",
    resources: [],
  });
  await processService.publishProcess(admin, process._id);
  const step = await stepService.createStep(admin, {
    processId: process._id,
    title,
    description: "",
    instruction: "",
    resources: [],
    links: [],
    completionCriteria: "",
  });
  await stepService.publishStep(admin, step._id);
  return { process, step };
}

describe("aislamiento de tenant — progress.repository / progress.service", () => {
  it("completeStep rechaza un step de otro tenant (NotFoundError, sin revelar existencia)", async () => {
    const { user: userA } = await makeTenantWithPublishedStage("cross-a");
    const { admin: adminB, stage: stageB } = await makeTenantWithPublishedStage("cross-b");
    const { step: stepB } = await createAndPublishStep(adminB, stageB._id, "Paso B");

    await expect(progressService.completeStep(userA, stepB._id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("markContentAsRead rechaza un content_item de otro tenant", async () => {
    const { user: userA } = await makeTenantWithPublishedStage("cross-c");
    const { admin: adminB, stage: stageB } = await makeTenantWithPublishedStage("cross-d");
    const itemB = await createAndPublishObligatoryContent(adminB, stageB._id, "No negociable B");

    await expect(progressService.markContentAsRead(userA, itemB._id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("el progreso de un usuario no afecta ni es visible para otro usuario del mismo tenant", async () => {
    const { admin, stage, role, tenant } = await makeTenantWithPublishedStage("same-tenant");
    const { step } = await createAndPublishStep(admin, stage._id, "Paso compartido");

    const userA: RequestIdentity = { userId: new ObjectId(), tenantId: tenant._id, status: "ACTIVE", platformRole: "USER", functionalRoleId: role._id };
    const userB: RequestIdentity = { userId: new ObjectId(), tenantId: tenant._id, status: "ACTIVE", platformRole: "USER", functionalRoleId: role._id };

    await progressService.completeStep(userA, step._id);

    const journeyA = await progressService.resolveJourney(userA);
    const journeyB = await progressService.resolveJourney(userB);

    expect(journeyA.stages[0].completedCount).toBe(1);
    expect(journeyB.stages[0].completedCount).toBe(0);
  });
});

describe("markContentAsRead — solo OBLIGATORY es completable", () => {
  it("rechaza un content_item INFORMATIONAL con ValidationError", async () => {
    const { admin, stage, user } = await makeTenantWithPublishedStage("informational");
    const item = await contentService.createContentItem(admin, {
      stageId: stage._id,
      type: "TEXT",
      scope: "COMMON",
      roleIds: [],
      title: "Informativo",
      body: "x",
      requirement: "INFORMATIONAL",
    });
    await contentService.publishContentItem(admin, item._id);

    await expect(progressService.markContentAsRead(user, item._id)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("completeStep / markContentAsRead — idempotencia", () => {
  it("completar un step dos veces no falla y no cambia completedAt", async () => {
    const { admin, stage, user } = await makeTenantWithPublishedStage("idempotent");
    const { step } = await createAndPublishStep(admin, stage._id, "Paso idempotente");

    await progressService.completeStep(user, step._id);
    const first = await progressRepository.findOne(user.tenantId, user.userId, "STEP", step._id);

    await expect(progressService.completeStep(user, step._id)).resolves.not.toThrow();
    const second = await progressRepository.findOne(user.tenantId, user.userId, "STEP", step._id);

    expect(second?.completedAt.getTime()).toBe(first?.completedAt.getTime());
  });
});

describe("etapa isBlocking vacía — caso obligatorio de Fase 4", () => {
  it("una etapa PUBLISHED isBlocking sin contenido visible no traba al usuario", async () => {
    const { admin, stage: emptyStage, user } = await makeTenantWithPublishedStage("empty-blocking");
    // emptyStage no tiene contenido ni pasos -> total=0 -> COMPLETE, no bloquea.
    const nextStage = await stageService.createStage(admin, {
      title: "Siguiente etapa",
      isBlocking: false,
      dependsOnStageId: emptyStage._id,
    });
    await stageService.publishStage(admin, nextStage._id);
    await createAndPublishStep(admin, nextStage._id, "Paso de la siguiente etapa");

    const journey = await progressService.resolveJourney(user);
    const empty = journey.stages.find((s) => s.id === emptyStage._id.toString());
    const next = journey.stages.find((s) => s.id === nextStage._id.toString());

    expect(empty?.status).toBe("COMPLETE");
    expect(empty?.readOnly).toBe(true);
    expect(next?.unlocked).toBe(true);
  });
});

describe("archivado post-completado no borra histórico pero sale de los totales actuales", () => {
  it("un step completado y luego archivado deja de contar, pero su registro de progreso persiste", async () => {
    const { admin, stage, user } = await makeTenantWithPublishedStage("archived-after");
    const { step: step1 } = await createAndPublishStep(admin, stage._id, "Paso 1");
    await createAndPublishStep(admin, stage._id, "Paso 2");

    await progressService.completeStep(user, step1._id);
    await stepService.archiveStep(admin, step1._id);

    const journey = await progressService.resolveJourney(user);
    const stageView = journey.stages.find((s) => s.id === stage._id.toString());
    // Solo queda 1 step visible (Paso 2, no completado) -> total=1, completed=0.
    expect(stageView?.totalCompletable).toBe(1);
    expect(stageView?.completedCount).toBe(0);
    expect(stageView?.status).toBe("NOT_STARTED");

    const historical = await progressRepository.findOne(user.tenantId, user.userId, "STEP", step1._id);
    expect(historical).not.toBeNull();
  });
});

describe("progreso sticky — etapa completada no se reabre", () => {
  it("completar el último ítem persiste el sticky; agregar contenido obligatorio nuevo no reabre la etapa", async () => {
    const { admin, stage, user } = await makeTenantWithPublishedStage("sticky");
    const { step } = await createAndPublishStep(admin, stage._id, "Único paso");

    await progressService.completeStep(user, step._id);

    const sticky = await progressRepository.findOne(user.tenantId, user.userId, "STAGE", stage._id);
    expect(sticky).not.toBeNull();

    const journeyBefore = await progressService.resolveJourney(user);
    expect(journeyBefore.stages[0].status).toBe("COMPLETE");

    // El admin agrega contenido obligatorio nuevo DESPUÉS de que la etapa
    // ya fue completada por el usuario.
    await createAndPublishObligatoryContent(admin, stage._id, "Nuevo no-negociable");

    const journeyAfter = await progressService.resolveJourney(user);
    const stageAfter = journeyAfter.stages.find((s) => s.id === stage._id.toString());
    expect(stageAfter?.status).toBe("COMPLETE");
    expect(stageAfter?.totalCompletable).toBe(2); // el total sí creció...
    expect(stageAfter?.completedCount).toBe(1); // ...pero el sticky es lo que manda.
  });

  it("auto-reparación: si el sticky no se persistió al completar, resolveJourney lo repara y sigue protegiendo contra contenido nuevo", async () => {
    const { admin, stage, user } = await makeTenantWithPublishedStage("self-heal");
    const { step, process } = await createAndPublishStep(admin, stage._id, "Único paso self-heal");

    // Simula que el write sticky del momento de completar falló: se
    // completa el item directamente por repo, sin pasar por
    // progressService.completeStep (que sí intenta el sticky-write).
    await progressRepository.upsertCompletion({
      tenantId: user.tenantId,
      userId: user.userId,
      targetType: "STEP",
      targetId: step._id,
      stageId: stage._id,
      processId: process._id,
    });

    const beforeHeal = await progressRepository.findOne(user.tenantId, user.userId, "STAGE", stage._id);
    expect(beforeHeal).toBeNull();

    const journey = await progressService.resolveJourney(user);
    expect(journey.stages[0].status).toBe("COMPLETE");

    const afterHeal = await progressRepository.findOne(user.tenantId, user.userId, "STAGE", stage._id);
    expect(afterHeal).not.toBeNull();

    // Y ahora que el sticky quedó reparado, contenido nuevo tampoco reabre.
    await createAndPublishObligatoryContent(admin, stage._id, "No-negociable post-reparación");
    const journeyAfter = await progressService.resolveJourney(user);
    expect(journeyAfter.stages[0].status).toBe("COMPLETE");
  });
});

describe("estado terminal", () => {
  it("todas las etapas COMPLETE -> currentStageId null, sin romper", async () => {
    const { admin, stage, user } = await makeTenantWithPublishedStage("terminal");
    const { step } = await createAndPublishStep(admin, stage._id, "Único paso");
    await progressService.completeStep(user, step._id);

    const journey = await progressService.resolveJourney(user);
    expect(journey.currentStageId).toBeNull();
    expect(journey.routeStatus).toBe("COMPLETE");
  });
});
