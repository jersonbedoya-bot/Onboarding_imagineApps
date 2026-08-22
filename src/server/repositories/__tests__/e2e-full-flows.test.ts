import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import * as tenantRepository from "@/server/repositories/tenant.repository";
import * as roleRepository from "@/server/repositories/role.repository";
import * as routeService from "@/server/services/route.service";
import * as stageService from "@/server/services/stage.service";
import * as contentService from "@/server/services/content.service";
import * as processService from "@/server/services/process.service";
import * as stepService from "@/server/services/step.service";
import * as invitationService from "@/server/services/invitation.service";
import { authenticateUser } from "@/server/services/auth.service";
import * as progressService from "@/server/services/progress.service";
import * as progressRepository from "@/server/repositories/progress.repository";
import * as stepRepository from "@/server/repositories/step.repository";
import type { RequestIdentity } from "@/server/auth/session";

/**
 * E2E de los dos flujos del PRD §56, ejercitando los services reales de
 * punta a punta (nada mockeado) contra Mongo en memoria.
 *
 * Es UN solo test, no tres: el `afterEach` global (ver setup.ts) borra
 * todas las colecciones entre cada `it()` para mantener aislados a los
 * tests normales — algo correcto en general, pero incompatible con una
 * narrativa que necesita que los datos de una fase sobrevivan a la
 * siguiente. Por eso las 3 fases (admin / usuario / cruce) son funciones
 * internas llamadas en secuencia dentro de un único `it`.
 */
describe("E2E — flujo admin, flujo usuario, y cruce entre ambos (PRD §56)", () => {
  it("admin construye y publica -> usuario acepta, recorre y completa -> cruce (publicar/archivar post-completado)", async () => {
    const scenario = await runAdminFlow();
    await runUserFlow(scenario);
    await runCrossoverFlow(scenario);
  });
});

type Scenario = {
  tenant: Awaited<ReturnType<typeof tenantRepository.create>>;
  pdmRole: Awaited<ReturnType<typeof roleRepository.create>>;
  uxRole: Awaited<ReturnType<typeof roleRepository.create>>;
  admin: RequestIdentity;
  stage1: Awaited<ReturnType<typeof stageService.createStage>>;
  stage2: Awaited<ReturnType<typeof stageService.createStage>>;
  stage3: Awaited<ReturnType<typeof stageService.createStage>>;
  stage2ObligatoryItemId: ObjectId;
  step1Id: ObjectId;
  step2Id: ObjectId;
  user?: RequestIdentity;
};

async function runAdminFlow(): Promise<Scenario> {
    const tenant = await tenantRepository.create({ name: "Imagine Apps E2E", slug: "imagine-apps-e2e" });
    const pdmRole = await roleRepository.create({ tenantId: tenant._id, key: "PDM", label: "PDM" });
    const uxRole = await roleRepository.create({ tenantId: tenant._id, key: "UX_UI_DESIGNER", label: "UX/UI" });
    const admin: RequestIdentity = {
      userId: new ObjectId(),
      tenantId: tenant._id,
      status: "ACTIVE",
      platformRole: "ADMIN",
      functionalRoleId: null,
    };

    await routeService.publishRoute(admin);

    // Etapa 1: sin dependencia, isBlocking. Solo contenido informativo
    // (total completable = 0 -> vacuously COMPLETE, no traba a nadie).
    const stage1 = await stageService.createStage(admin, { title: "Bienvenida", isBlocking: true });
    await stageService.publishStage(admin, stage1._id);
    const welcomeItem = await contentService.createContentItem(admin, {
      stageId: stage1._id,
      type: "TEXT",
      scope: "COMMON",
      roleIds: [],
      title: "Bienvenida al equipo",
      body: "...",
      requirement: "INFORMATIONAL",
    });
    await contentService.publishContentItem(admin, welcomeItem._id);

    // Etapa 2: depende de la 1, isBlocking. Un OBLIGATORY común (lo debe
    // ver y poder marcar cualquier rol) y un item específico de PDM (para
    // probar que UX/UI NO lo ve).
    const stage2 = await stageService.createStage(admin, {
      title: "No negociables",
      isBlocking: true,
      dependsOnStageId: stage1._id,
    });
    await stageService.publishStage(admin, stage2._id);
    const obligatoryItem = await contentService.createContentItem(admin, {
      stageId: stage2._id,
      type: "TEXT",
      scope: "COMMON",
      roleIds: [],
      title: "Código de conducta",
      body: "...",
      requirement: "OBLIGATORY",
    });
    await contentService.publishContentItem(admin, obligatoryItem._id);
    const pdmOnlyItem = await contentService.createContentItem(admin, {
      stageId: stage2._id,
      type: "TEXT",
      scope: "ROLE",
      roleIds: [pdmRole._id],
      title: "Específico de PDM",
      body: "...",
      requirement: "INFORMATIONAL",
    });
    await contentService.publishContentItem(admin, pdmOnlyItem._id);

    // Etapa 3: depende de la 2, isBlocking. Un proceso con 2 pasos, scope PDM.
    const stage3 = await stageService.createStage(admin, {
      title: "Ruta PDM",
      isBlocking: true,
      dependsOnStageId: stage2._id,
    });
    await stageService.publishStage(admin, stage3._id);
    const process = await processService.createProcess(admin, {
      stageId: stage3._id,
      scope: "ROLE",
      roleIds: [pdmRole._id],
      title: "Gestión de backlog",
      objective: "o",
      context: "c",
      expectedResult: "r",
      resources: [],
    });
    await processService.publishProcess(admin, process._id);
    const step1 = await stepService.createStep(admin, {
      processId: process._id,
      title: "Crear el primer épico",
      description: "",
      instruction: "",
      resources: [],
      links: [],
      completionCriteria: "c",
    });
    await stepService.publishStep(admin, step1._id);
    const step2 = await stepService.createStep(admin, {
      processId: process._id,
      title: "Priorizar el backlog",
      description: "",
      instruction: "",
      resources: [],
      links: [],
      completionCriteria: "c",
    });
    await stepService.publishStep(admin, step2._id);

    // ---- Verificación de visibilidad por rol ----
    const visibleForPdm = await contentService.resolveVisibleContent(tenant._id, pdmRole._id);
    const stage2ItemsForPdm = visibleForPdm.stages.find((s) => s.stage._id.equals(stage2._id))!.items;
    expect(stage2ItemsForPdm.map((i) => i.title).sort()).toEqual(["Código de conducta", "Específico de PDM"]);

    const visibleForUx = await contentService.resolveVisibleContent(tenant._id, uxRole._id);
    const stage2ItemsForUx = visibleForUx.stages.find((s) => s.stage._id.equals(stage2._id))!.items;
    // UX/UI ve el común, pero NO el específico de PDM.
    expect(stage2ItemsForUx.map((i) => i.title)).toEqual(["Código de conducta"]);

    const stepsForPdm = await stepService.resolveVisibleSteps(tenant._id, pdmRole._id);
    expect(stepsForPdm.processes).toHaveLength(1);
    expect(stepsForPdm.processes[0].steps.map((s) => s.title).sort()).toEqual([
      "Crear el primer épico",
      "Priorizar el backlog",
    ]);

    const stepsForUx = await stepService.resolveVisibleSteps(tenant._id, uxRole._id);
    // El proceso es scope ROLE=PDM -> UX/UI no ve ningún proceso.
    expect(stepsForUx.processes).toHaveLength(0);

    return {
      tenant,
      pdmRole,
      uxRole,
      admin,
      stage1,
      stage2,
      stage3,
      stage2ObligatoryItemId: obligatoryItem._id,
      step1Id: step1._id,
      step2Id: step2._id,
    };
}

async function runUserFlow(scenario: Scenario): Promise<void> {
  const { admin, pdmRole } = scenario;

  // --- Invitación → aceptación (mismo camino que un usuario real: el
  // admin nunca decide el rol vía body arbitrario, sale de la invitación) ---
  const { link } = await invitationService.createInvitation(admin, {
    email: "pdm.e2e@example.com",
    functionalRoleId: pdmRole._id,
  });
  const rawToken = link.split("/").pop()!;

  const preview = await invitationService.previewInvitation(rawToken);
  expect(preview.roleLabel).toBe("PDM");

  const { userId } = await invitationService.acceptInvitation(rawToken, {
    name: "PDM E2E",
    password: "pdmpass123",
  });

  // --- Login real: prueba que el passwordHash generado en accept
  // efectivamente autentica con la contraseña en texto plano enviada ---
  const authenticated = await authenticateUser({ email: "pdm.e2e@example.com", password: "pdmpass123" });
  expect(authenticated?.userId.toString()).toBe(userId.toString());

  const user: RequestIdentity = {
    userId,
    tenantId: authenticated!.tenantId,
    status: "ACTIVE",
    platformRole: "USER",
    functionalRoleId: pdmRole._id,
  };
  scenario.user = user;

  // --- Estado inicial del recorrido ---
  const journeyStart = await progressService.resolveJourney(user);
  const stage1Start = journeyStart.stages.find((s) => s.id === scenario.stage1._id.toString())!;
  const stage2Start = journeyStart.stages.find((s) => s.id === scenario.stage2._id.toString())!;
  const stage3Start = journeyStart.stages.find((s) => s.id === scenario.stage3._id.toString())!;

  expect(stage1Start.status).toBe("COMPLETE"); // solo-lectura, total=0
  expect(stage1Start.readOnly).toBe(true);
  expect(stage2Start.status).toBe("NOT_STARTED");
  expect(stage2Start.unlocked).toBe(true); // stage1 es COMPLETE
  expect(stage3Start.unlocked).toBe(false); // stage2 todavía no está completa
  expect(journeyStart.currentStageId).toBe(scenario.stage2._id.toString());

  // --- Marcar el contenido obligatorio como leído ---
  await progressService.markContentAsRead(user, scenario.stage2ObligatoryItemId);

  const journeyAfterRead = await progressService.resolveJourney(user);
  const stage2AfterRead = journeyAfterRead.stages.find((s) => s.id === scenario.stage2._id.toString())!;
  const stage3AfterRead = journeyAfterRead.stages.find((s) => s.id === scenario.stage3._id.toString())!;
  expect(stage2AfterRead.status).toBe("COMPLETE");
  expect(stage3AfterRead.unlocked).toBe(true);
  expect(journeyAfterRead.currentStageId).toBe(scenario.stage3._id.toString());

  // --- Completar los 2 pasos (sin orden forzado: el segundo primero) ---
  await progressService.completeStep(user, scenario.step2Id);
  await progressService.completeStep(user, scenario.step1Id);

  const journeyTerminal = await progressService.resolveJourney(user);
  expect(journeyTerminal.currentStageId).toBeNull();
  expect(journeyTerminal.routeStatus).toBe("COMPLETE");
  expect(journeyTerminal.stages.every((s) => s.status === "COMPLETE")).toBe(true);
}

async function runCrossoverFlow(scenario: Scenario): Promise<void> {
  const { admin, user, stage2, stage3, step1Id } = scenario;

  // --- admin publica -> usuario ve (y el sticky no reabre) ---
  const newObligatoryItem = await contentService.createContentItem(admin, {
    stageId: stage2._id,
    type: "TEXT",
    scope: "COMMON",
    roleIds: [],
    title: "Política agregada después del sticky",
    body: "...",
    requirement: "OBLIGATORY",
  });
  await contentService.publishContentItem(admin, newObligatoryItem._id);

  const journeyAfterNewContent = await progressService.resolveJourney(user!);
  const stage2AfterNewContent = journeyAfterNewContent.stages.find((s) => s.id === stage2._id.toString())!;

  // El usuario SÍ ve el item nuevo...
  expect(stage2AfterNewContent.items.map((i) => i.title)).toContain("Política agregada después del sticky");
  const newItemView = stage2AfterNewContent.items.find((i) => i.title === "Política agregada después del sticky")!;
  expect(newItemView.completed).toBe(false);
  // ...pero la etapa sigue COMPLETE (sticky) y el onboarding sigue terminado.
  expect(stage2AfterNewContent.status).toBe("COMPLETE");
  expect(journeyAfterNewContent.currentStageId).toBeNull();
  expect(journeyAfterNewContent.routeStatus).toBe("COMPLETE");

  // --- admin archiva un paso ya completado ---
  await stepService.archiveStep(admin, step1Id);

  const journeyAfterArchive = await progressService.resolveJourney(user!);
  const stage3AfterArchive = journeyAfterArchive.stages.find((s) => s.id === stage3._id.toString())!;

  // El usuario deja de verlo entre los pasos del proceso...
  expect(stage3AfterArchive.processes[0].steps.map((s) => s.id)).not.toContain(step1Id.toString());
  // ...la etapa 3 sigue COMPLETE (el otro paso ya estaba completado, y
  // ahora es 1/1 de lo que queda visible) y el onboarding sigue terminado.
  expect(stage3AfterArchive.status).toBe("COMPLETE");
  expect(journeyAfterArchive.currentStageId).toBeNull();

  // ...pero el registro de que ESE usuario completó ESE paso no se borró.
  const historicalProgress = await progressRepository.findOne(user!.tenantId, user!.userId, "STEP", step1Id);
  expect(historicalProgress).not.toBeNull();
  const archivedStep = await stepRepository.findById(user!.tenantId, step1Id);
  expect(archivedStep?.status).toBe("ARCHIVED");
}
