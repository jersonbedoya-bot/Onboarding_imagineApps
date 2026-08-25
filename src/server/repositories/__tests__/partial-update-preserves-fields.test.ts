import { describe, expect, it } from "vitest";
import * as tenantRepository from "@/server/repositories/tenant.repository";
import * as roleRepository from "@/server/repositories/role.repository";
import * as routeRepository from "@/server/repositories/route.repository";
import * as stageRepository from "@/server/repositories/stage.repository";
import * as contentRepository from "@/server/repositories/content.repository";
import * as processRepository from "@/server/repositories/process.repository";
import * as stepRepository from "@/server/repositories/step.repository";
import * as leaderRepository from "@/server/repositories/leader.repository";
import { updateContentItemSchema } from "@/server/validation/content.schema";
import { updateProcessSchema } from "@/server/validation/process.schema";
import { updateStepSchema } from "@/server/validation/step.schema";
import { updateLeaderSchema } from "@/server/validation/leader.schema";

/**
 * Regresión: un PATCH que solo manda un campo no debe pisar los demás con
 * null/"". Encontrado en dev (2026-08-24) editando un content_item real:
 * el driver de Mongo serializa `undefined` como BSON null, y los schemas
 * de update reusaban campos de create con `.default(...)`, que convertía
 * "campo ausente" en "campo explícitamente vacío" antes de llegar al repo.
 * Ver src/lib/mongo-patch.ts (fix de repo) y los schemas de validación
 * (fix de zod) — este test cubre ambas capas.
 */

async function makeTenantWithStage(suffix: string) {
  const tenant = await tenantRepository.create({ name: `Tenant ${suffix}`, slug: `tenant-partial-${suffix}` });
  const role = await roleRepository.create({ tenantId: tenant._id, key: "PDM", label: "PDM" });
  const { route } = await routeRepository.getOrCreate(tenant._id, "Ruta de onboarding");
  const stage = await stageRepository.create({
    tenantId: tenant._id,
    routeId: route._id,
    key: `etapa-${suffix}`,
    title: `Etapa ${suffix}`,
    order: 1,
    dependsOnStageId: null,
    isBlocking: false,
  });
  return { tenant, role, stage };
}

describe("schemas de update no inyectan defaults sobre campos ausentes", () => {
  it("updateContentItemSchema deja requirement sin tocar si no viene en el patch", () => {
    const result = updateContentItemSchema.safeParse({ title: "solo titulo" });
    expect(result.success).toBe(true);
    expect(result.success && "requirement" in result.data).toBe(false);
  });

  it("updateStepSchema deja description/instruction/resources/links/completionCriteria sin tocar", () => {
    const result = updateStepSchema.safeParse({ title: "solo titulo" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ title: "solo titulo" });
    }
  });

  it("updateProcessSchema deja objective/context/expectedResult/resources sin tocar", () => {
    const result = updateProcessSchema.safeParse({ title: "solo titulo" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ title: "solo titulo" });
    }
  });

  it("updateLeaderSchema deja description sin tocar", () => {
    const result = updateLeaderSchema.safeParse({ name: "solo nombre" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "solo nombre" });
    }
  });
});

describe("repositorios: update() parcial no pisa campos no incluidos", () => {
  it("content.repository.update: patch de solo requirement preserva title/body/type/scope/roleIds", async () => {
    const { tenant, role, stage } = await makeTenantWithStage("content");
    const item = await contentRepository.create({
      tenantId: tenant._id,
      stageId: stage._id,
      type: "VIDEO",
      scope: "ROLE",
      roleIds: [role._id],
      title: "Original",
      body: "cuerpo original",
      mediaId: null,
      videoUrl: "https://www.youtube.com/embed/abc123def45",
      videoProvider: "YOUTUBE",
      requirement: null,
      order: 1,
    });

    const updated = await contentRepository.update(tenant._id, item._id, { requirement: "OBLIGATORY" });

    expect(updated?.requirement).toBe("OBLIGATORY");
    expect(updated?.title).toBe("Original");
    expect(updated?.body).toBe("cuerpo original");
    expect(updated?.type).toBe("VIDEO");
    expect(updated?.scope).toBe("ROLE");
    expect(updated?.roleIds.map((id) => id.toString())).toEqual([role._id.toString()]);
    expect(updated?.videoUrl).toBe("https://www.youtube.com/embed/abc123def45");
  });

  it("process.repository.update: patch de solo title preserva objective/context/expectedResult/resources", async () => {
    const { tenant, role, stage } = await makeTenantWithStage("process");
    const process = await processRepository.create({
      tenantId: tenant._id,
      stageId: stage._id,
      scope: "ROLE",
      roleIds: [role._id],
      title: "Original",
      objective: "objetivo original",
      context: "contexto original",
      expectedResult: "resultado original",
      resources: ["recurso-1"],
      order: 1,
    });

    const updated = await processRepository.update(tenant._id, process._id, { title: "Nuevo título" });

    expect(updated?.title).toBe("Nuevo título");
    expect(updated?.objective).toBe("objetivo original");
    expect(updated?.context).toBe("contexto original");
    expect(updated?.expectedResult).toBe("resultado original");
    expect(updated?.resources).toEqual(["recurso-1"]);
  });

  it("step.repository.update: patch de solo title preserva description/instruction/videoUrl/completionCriteria", async () => {
    const { tenant, stage } = await makeTenantWithStage("step");
    const process = await processRepository.create({
      tenantId: tenant._id,
      stageId: stage._id,
      scope: "COMMON",
      roleIds: [],
      title: "Proceso",
      objective: "",
      context: "",
      expectedResult: "",
      resources: [],
      order: 1,
    });
    const step = await stepRepository.create({
      tenantId: tenant._id,
      processId: process._id,
      title: "Original",
      description: "descripción original",
      instruction: "instrucción original",
      resources: [],
      videoUrl: "https://www.youtube.com/embed/abc123def45",
      videoProvider: "YOUTUBE",
      links: [],
      completionCriteria: "criterio original",
      order: 1,
    });

    const updated = await stepRepository.update(tenant._id, step._id, { title: "Nuevo título" });

    expect(updated?.title).toBe("Nuevo título");
    expect(updated?.description).toBe("descripción original");
    expect(updated?.instruction).toBe("instrucción original");
    expect(updated?.videoUrl).toBe("https://www.youtube.com/embed/abc123def45");
    expect(updated?.completionCriteria).toBe("criterio original");
  });

  it("leader.repository.update: patch de solo title preserva description/videoUrl/scope/roleIds", async () => {
    const { tenant, role } = await makeTenantWithStage("leader");
    const leader = await leaderRepository.create({
      tenantId: tenant._id,
      name: "Original",
      title: "Cargo original",
      description: "descripción original",
      photoMediaId: null,
      videoUrl: "https://www.youtube.com/embed/abc123def45",
      videoProvider: "YOUTUBE",
      scope: "ROLE",
      roleIds: [role._id],
      order: 1,
    });

    const updated = await leaderRepository.update(tenant._id, leader._id, { title: "Nuevo cargo" });

    expect(updated?.title).toBe("Nuevo cargo");
    expect(updated?.description).toBe("descripción original");
    expect(updated?.videoUrl).toBe("https://www.youtube.com/embed/abc123def45");
    expect(updated?.scope).toBe("ROLE");
    expect(updated?.roleIds.map((id) => id.toString())).toEqual([role._id.toString()]);
  });
});
