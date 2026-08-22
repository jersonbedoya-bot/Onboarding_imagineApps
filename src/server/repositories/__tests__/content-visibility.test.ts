import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import * as tenantRepository from "@/server/repositories/tenant.repository";
import * as roleRepository from "@/server/repositories/role.repository";
import * as routeService from "@/server/services/route.service";
import * as stageService from "@/server/services/stage.service";
import * as contentService from "@/server/services/content.service";
import type { RequestIdentity } from "@/server/auth/session";

async function setupTenant() {
  const tenant = await tenantRepository.create({ name: "Imagine Apps Test", slug: `visibility-${new ObjectId().toString()}` });
  const pdmRole = await roleRepository.create({ tenantId: tenant._id, key: "PDM", label: "PDM" });
  const uxRole = await roleRepository.create({ tenantId: tenant._id, key: "UX_UI_DESIGNER", label: "UX/UI Designer" });
  const admin: RequestIdentity = {
    userId: new ObjectId(),
    tenantId: tenant._id,
    status: "ACTIVE",
    platformRole: "ADMIN",
    functionalRoleId: null,
  };
  return { tenant, pdmRole, uxRole, admin };
}

describe("resolveVisibleContent — común vs por rol", () => {
  it("un PDM ve el contenido común + el de PDM, nunca el de UX/UI", async () => {
    const { tenant, pdmRole, uxRole, admin } = await setupTenant();

    const welcome = await stageService.createStage(admin, { title: "Bienvenida", isBlocking: false });
    const roleStage = await stageService.createStage(admin, { title: "Ruta por rol", isBlocking: false });

    const commonItem = await contentService.createContentItem(admin, {
      stageId: welcome._id,
      type: "TEXT",
      scope: "COMMON",
      roleIds: [],
      title: "Misión y visión",
      body: "...",
      requirement: null,
    });
    const pdmItem = await contentService.createContentItem(admin, {
      stageId: roleStage._id,
      type: "TEXT",
      scope: "ROLE",
      roleIds: [pdmRole._id],
      title: "Backlog y gestión de proyectos",
      body: "...",
      requirement: null,
    });
    const uxItem = await contentService.createContentItem(admin, {
      stageId: roleStage._id,
      type: "TEXT",
      scope: "ROLE",
      roleIds: [uxRole._id],
      title: "Investigación y flujos",
      body: "...",
      requirement: null,
    });

    await routeService.publishRoute(admin);
    await stageService.publishStage(admin, welcome._id);
    await stageService.publishStage(admin, roleStage._id);
    await contentService.publishContentItem(admin, commonItem._id);
    await contentService.publishContentItem(admin, pdmItem._id);
    await contentService.publishContentItem(admin, uxItem._id);

    const forPdm = await contentService.resolveVisibleContent(tenant._id, pdmRole._id);
    const pdmVisibleIds = forPdm.stages.flatMap((s) => s.items.map((i) => i._id.toString()));
    expect(pdmVisibleIds).toContain(commonItem._id.toString());
    expect(pdmVisibleIds).toContain(pdmItem._id.toString());
    expect(pdmVisibleIds).not.toContain(uxItem._id.toString());

    const forUx = await contentService.resolveVisibleContent(tenant._id, uxRole._id);
    const uxVisibleIds = forUx.stages.flatMap((s) => s.items.map((i) => i._id.toString()));
    expect(uxVisibleIds).toContain(commonItem._id.toString());
    expect(uxVisibleIds).toContain(uxItem._id.toString());
    expect(uxVisibleIds).not.toContain(pdmItem._id.toString());
  });

  it("un content_item en DRAFT nunca aparece, aunque el scope coincida", async () => {
    const { tenant, pdmRole, admin } = await setupTenant();

    const stage = await stageService.createStage(admin, { title: "Bienvenida", isBlocking: false });
    const draftItem = await contentService.createContentItem(admin, {
      stageId: stage._id,
      type: "TEXT",
      scope: "COMMON",
      roleIds: [],
      title: "Todavía en borrador",
      body: "...",
      requirement: null,
    });

    await routeService.publishRoute(admin);
    await stageService.publishStage(admin, stage._id);
    // Nota: draftItem nunca se publica.

    const result = await contentService.resolveVisibleContent(tenant._id, pdmRole._id);
    const visibleIds = result.stages.flatMap((s) => s.items.map((i) => i._id.toString()));
    expect(visibleIds).not.toContain(draftItem._id.toString());
  });

  it("el contenido de una etapa no publicada no aparece, aunque el item esté PUBLISHED", async () => {
    const { tenant, pdmRole, admin } = await setupTenant();

    const unpublishedStage = await stageService.createStage(admin, { title: "Etapa sin publicar", isBlocking: false });
    const item = await contentService.createContentItem(admin, {
      stageId: unpublishedStage._id,
      type: "TEXT",
      scope: "COMMON",
      roleIds: [],
      title: "x",
      body: "y",
      requirement: null,
    });

    await routeService.publishRoute(admin);
    await contentService.publishContentItem(admin, item._id);
    // Nota: unpublishedStage nunca se publica.

    const result = await contentService.resolveVisibleContent(tenant._id, pdmRole._id);
    expect(result.stages).toHaveLength(0);
  });

  it("si la ruta no está publicada, no se ve nada aunque etapas y contenido sí lo estén", async () => {
    const { tenant, pdmRole, admin } = await setupTenant();

    const stage = await stageService.createStage(admin, { title: "Bienvenida", isBlocking: false });
    const item = await contentService.createContentItem(admin, {
      stageId: stage._id,
      type: "TEXT",
      scope: "COMMON",
      roleIds: [],
      title: "x",
      body: "y",
      requirement: null,
    });
    await stageService.publishStage(admin, stage._id);
    await contentService.publishContentItem(admin, item._id);
    // Nota: la ruta nunca se publica.

    const result = await contentService.resolveVisibleContent(tenant._id, pdmRole._id);
    expect(result.route).toBeNull();
    expect(result.stages).toHaveLength(0);
  });
});
