import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import * as tenantRepository from "@/server/repositories/tenant.repository";
import * as roleRepository from "@/server/repositories/role.repository";
import * as routeService from "@/server/services/route.service";
import * as stageService from "@/server/services/stage.service";
import * as contentService from "@/server/services/content.service";
import * as processService from "@/server/services/process.service";
import * as progressService from "@/server/services/progress.service";
import type { RequestIdentity } from "@/server/auth/session";

/**
 * Las etapas se comparten entre roles y solo su contenido se filtra por
 * rol: una etapa donde todo es de OTRO rol (ej. el onboarding técnico de
 * Desarrollo, visto por un PDM) no debe aparecer en el recorrido — ni
 * vacía, ni contando como fase completa.
 */
describe("Etapas sin contenido visible para el rol", () => {
  it("se omiten del recorrido de ese rol y siguen visibles para el rol dueño", async () => {
    const tenant = await tenantRepository.create({ name: "Imagine Apps", slug: "imagine-apps-stage-visibility" });
    const pdmRole = await roleRepository.create({ tenantId: tenant._id, key: "PDM", label: "PDM" });
    const devRole = await roleRepository.create({ tenantId: tenant._id, key: "DESARROLLO", label: "Desarrollo" });
    const admin: RequestIdentity = {
      userId: new ObjectId(),
      tenantId: tenant._id,
      status: "ACTIVE",
      platformRole: "ADMIN",
      functionalRoleId: null,
    };
    await routeService.publishRoute(admin);

    const common = await stageService.createStage(admin, { title: "Bienvenida", isBlocking: true });
    await stageService.publishStage(admin, common._id);
    const welcome = await contentService.createContentItem(admin, {
      stageId: common._id,
      type: "TEXT",
      scope: "COMMON",
      roleIds: [],
      title: "Bienvenida",
      body: "Hola",
      requirement: "INFORMATIONAL",
    });
    await contentService.publishContentItem(admin, welcome._id);

    const tech = await stageService.createStage(admin, {
      title: "Onboarding Técnico",
      isBlocking: true,
      dependsOnStageId: common._id,
    });
    await stageService.publishStage(admin, tech._id);
    const devProcess = await processService.createProcess(admin, {
      stageId: tech._id,
      scope: "ROLE",
      roleIds: [devRole._id],
      title: "Gitflow",
      objective: "",
      context: "",
      expectedResult: "",
      resources: [],
    });
    await processService.publishProcess(admin, devProcess._id);

    const pdmJourney = await progressService.resolveJourneyFor(tenant._id, new ObjectId(), pdmRole._id);
    expect(pdmJourney.stages.map((s) => s.id)).toEqual([common._id.toString()]);

    const devJourney = await progressService.resolveJourneyFor(tenant._id, new ObjectId(), devRole._id);
    expect(devJourney.stages.map((s) => s.id)).toEqual([common._id.toString(), tech._id.toString()]);

    // La vista previa del admin por rol aplica la misma regla.
    const pdmPreview = await progressService.resolveJourneyPreview(tenant._id, pdmRole._id);
    expect(pdmPreview.stages.map((s) => s.id)).toEqual([common._id.toString()]);
  });
});
