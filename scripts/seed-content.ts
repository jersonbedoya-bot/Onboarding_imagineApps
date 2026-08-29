/**
 * Seed idempotente de contenido de onboarding (etapas, content items,
 * líderes) a partir de scripts/data/onboarding-content.ts.
 *
 * Reutiliza los services reales (route/stage/content/leader), no los
 * repositorios directos: así el contenido sembrado pasa por las mismas
 * validaciones (scope/roleIds, transición de estado) y queda auditado
 * igual que si un ADMIN lo hubiera creado desde el panel.
 *
 * Idempotente: busca por título antes de crear — si ya existe, hace skip
 * (no lo actualiza; para editar contenido ya sembrado, usar el panel
 * admin). Todo se crea en DRAFT: nunca publica automáticamente.
 *
 * Uso: npm run db:seed:content
 */
import type { ObjectId } from "mongodb";
import { logger } from "../src/lib/logger";
import * as tenantRepository from "../src/server/repositories/tenant.repository";
import * as roleRepository from "../src/server/repositories/role.repository";
import * as userRepository from "../src/server/repositories/user.repository";
import * as stageService from "../src/server/services/stage.service";
import * as contentService from "../src/server/services/content.service";
import * as leaderService from "../src/server/services/leader.service";
import * as processService from "../src/server/services/process.service";
import * as stepService from "../src/server/services/step.service";
import type { RequestIdentity } from "../src/server/auth/session";
import type { FunctionalRoleKey } from "../src/types/enums";
import { STAGES, LEADERS, type SeedStage, type SeedLeader, type SeedProcess } from "./data/onboarding-content";

const TENANT_SLUG = "imagine-apps";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function resolveActingAdmin(): Promise<RequestIdentity> {
  const tenant = await tenantRepository.findBySlug(TENANT_SLUG);
  if (!tenant) {
    throw new Error(`Tenant "${TENANT_SLUG}" no existe todavía — correr "npm run db:seed" primero.`);
  }

  const adminEmail = requiredEnv("SEED_ADMIN_EMAIL");
  const admin = await userRepository.findByEmail(adminEmail);
  if (!admin) {
    throw new Error(`Admin "${adminEmail}" no existe todavía — correr "npm run db:seed" primero.`);
  }

  return {
    userId: admin._id,
    tenantId: tenant._id,
    status: "ACTIVE",
    platformRole: "ADMIN",
    functionalRoleId: null,
  };
}

async function resolveRoleIds(tenantId: ObjectId, roleKeys: FunctionalRoleKey[] | undefined) {
  if (!roleKeys || roleKeys.length === 0) return [];
  const roles = await Promise.all(roleKeys.map((key) => roleRepository.findByKey(tenantId, key)));
  const missing = roleKeys.filter((_, i) => !roles[i]);
  if (missing.length > 0) {
    throw new Error(`Rol(es) funcionales no encontrados: ${missing.join(", ")} — correr "npm run db:seed" primero.`);
  }
  return roles.map((role) => role!._id);
}

async function ensureStage(actingAdmin: RequestIdentity, seed: SeedStage, dependsOnStageId: ObjectId | null) {
  const existingStages = await stageService.listStages(actingAdmin);
  const existing = existingStages.find((stage) => stage.title === seed.title);
  if (existing) {
    logger.info("seed_content_stage_skipped", { title: seed.title, reason: "already_exists" });
    return existing;
  }

  const stage = await stageService.createStage(actingAdmin, {
    title: seed.title,
    isBlocking: seed.isBlocking,
    dependsOnStageId: dependsOnStageId ?? undefined,
  });
  logger.info("seed_content_stage_created", { title: seed.title });
  return stage;
}

async function ensureContentItems(actingAdmin: RequestIdentity, stageId: ObjectId, seed: SeedStage) {
  if (!seed.contentItems || seed.contentItems.length === 0) return;
  const existingItems = await contentService.listContentByStage(actingAdmin, stageId);

  for (const item of seed.contentItems) {
    if (existingItems.some((existing) => existing.title === item.title)) {
      logger.info("seed_content_item_skipped", { title: item.title, reason: "already_exists" });
      continue;
    }

    const roleIds = await resolveRoleIds(actingAdmin.tenantId, item.roleKeys);
    await contentService.createContentItem(actingAdmin, {
      stageId,
      type: item.type,
      scope: item.scope,
      roleIds,
      title: item.title,
      body: item.body,
      requirement: item.requirement,
    });
    logger.info("seed_content_item_created", { title: item.title, stage: seed.title });
  }
}

async function ensureProcessSteps(actingAdmin: RequestIdentity, processId: ObjectId, seed: SeedProcess) {
  const existingSteps = await stepService.listStepsByProcess(actingAdmin, processId);

  for (const step of seed.steps) {
    if (existingSteps.some((existing) => existing.title === step.title)) {
      logger.info("seed_content_step_skipped", { title: step.title, reason: "already_exists" });
      continue;
    }

    await stepService.createStep(actingAdmin, {
      processId,
      title: step.title,
      description: "",
      instruction: step.instruction,
      resources: [],
      links: [],
      completionCriteria: "",
    });
    logger.info("seed_content_step_created", { title: step.title, process: seed.title });
  }
}

async function ensureProcesses(actingAdmin: RequestIdentity, stageId: ObjectId, seed: SeedStage) {
  if (!seed.processes || seed.processes.length === 0) return;
  const existingProcesses = await processService.listProcessesByStage(actingAdmin, stageId);

  for (const process of seed.processes) {
    let current = existingProcesses.find((existing) => existing.title === process.title);
    if (current) {
      logger.info("seed_content_process_skipped", { title: process.title, reason: "already_exists" });
    } else {
      const roleIds = await resolveRoleIds(actingAdmin.tenantId, process.roleKeys);
      current = await processService.createProcess(actingAdmin, {
        stageId,
        scope: process.scope,
        roleIds,
        title: process.title,
        objective: process.objective,
        context: process.context,
        expectedResult: process.expectedResult,
        resources: process.resources,
      });
      logger.info("seed_content_process_created", { title: process.title, stage: seed.title });
    }
    await ensureProcessSteps(actingAdmin, current._id, process);
  }
}

async function ensureLeader(actingAdmin: RequestIdentity, seed: SeedLeader) {
  const existingLeaders = await leaderService.listLeaders(actingAdmin);
  if (existingLeaders.some((existing) => existing.name === seed.name)) {
    logger.info("seed_content_leader_skipped", { name: seed.name, reason: "already_exists" });
    return;
  }

  const roleIds = await resolveRoleIds(actingAdmin.tenantId, seed.roleKeys);
  await leaderService.createLeader(actingAdmin, {
    name: seed.name,
    title: seed.title,
    description: seed.description,
    scope: seed.scope,
    roleIds,
  });
  logger.info("seed_content_leader_created", { name: seed.name });
}

async function main() {
  const actingAdmin = await resolveActingAdmin();

  const stageIdByTitle = new Map<string, ObjectId>();
  for (const seedStage of STAGES) {
    const dependsOnStageId = seedStage.dependsOnTitle ? (stageIdByTitle.get(seedStage.dependsOnTitle) ?? null) : null;
    if (seedStage.dependsOnTitle && !dependsOnStageId) {
      throw new Error(`"${seedStage.title}" depende de "${seedStage.dependsOnTitle}", que no se sembró antes en STAGES.`);
    }
    const stage = await ensureStage(actingAdmin, seedStage, dependsOnStageId);
    stageIdByTitle.set(seedStage.title, stage._id);
    await ensureContentItems(actingAdmin, stage._id, seedStage);
    await ensureProcesses(actingAdmin, stage._id, seedStage);
  }

  for (const seedLeader of LEADERS) {
    await ensureLeader(actingAdmin, seedLeader);
  }

  logger.info("seed_content_completed", {});
  process.exit(0);
}

main().catch((error) => {
  logger.error("seed_content_failed", { message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
