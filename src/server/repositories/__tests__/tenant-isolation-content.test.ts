import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import * as tenantRepository from "@/server/repositories/tenant.repository";
import * as roleRepository from "@/server/repositories/role.repository";
import * as routeRepository from "@/server/repositories/route.repository";
import * as stageRepository from "@/server/repositories/stage.repository";
import * as contentRepository from "@/server/repositories/content.repository";
import * as stageService from "@/server/services/stage.service";
import * as contentService from "@/server/services/content.service";
import { NotFoundError, ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";

async function makeTenantWithStage(suffix: string) {
  const tenant = await tenantRepository.create({ name: `Tenant ${suffix}`, slug: `tenant-content-${suffix}` });
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
  return { tenant, role, route, stage };
}

function actingAdminFor(tenantId: ObjectId): RequestIdentity {
  return { userId: new ObjectId(), tenantId, status: "ACTIVE", platformRole: "ADMIN", functionalRoleId: null };
}

describe("aislamiento de tenant — route.repository", () => {
  it("getOrCreate distingue creación de lectura, y es idempotente", async () => {
    const tenant = await tenantRepository.create({ name: "Route Fresh", slug: "route-fresh" });

    const first = await routeRepository.getOrCreate(tenant._id, "Ruta");
    const second = await routeRepository.getOrCreate(tenant._id, "Ruta");

    expect(first.wasCreated).toBe(true);
    expect(second.wasCreated).toBe(false);
    expect(first.route._id.toString()).toBe(second.route._id.toString());
  });

  it("no comparte ruta entre tenants", async () => {
    const { tenant: tenantA } = await makeTenantWithStage("route-a");
    const { tenant: tenantB } = await makeTenantWithStage("route-b");

    const routeA = await routeRepository.findByTenant(tenantA._id);
    const routeB = await routeRepository.findByTenant(tenantB._id);

    expect(routeA?._id.toString()).not.toBe(routeB?._id.toString());
  });
});

describe("aislamiento de tenant — stage.repository", () => {
  it("findById/update/updateStatus no afectan una etapa de otro tenant", async () => {
    const { tenant: tenantA, stage: stageA } = await makeTenantWithStage("stage-a");
    const { tenant: tenantB } = await makeTenantWithStage("stage-b");

    expect(await stageRepository.findById(tenantB._id, stageA._id)).toBeNull();
    expect(await stageRepository.update(tenantB._id, stageA._id, { title: "hackeado" })).toBeNull();
    expect(await stageRepository.updateStatus(tenantB._id, stageA._id, "PUBLISHED")).toBeNull();

    const stillOriginal = await stageRepository.findById(tenantA._id, stageA._id);
    expect(stillOriginal?.title).toBe("Etapa stage-a");
    expect(stillOriginal?.status).toBe("DRAFT");
  });

  it("createStage rechaza dependsOnStageId de otro tenant", async () => {
    const { tenant: tenantA } = await makeTenantWithStage("dep-a");
    const { stage: stageB } = await makeTenantWithStage("dep-b");
    const adminA = actingAdminFor(tenantA._id);

    await expect(
      stageService.createStage(adminA, { title: "Nueva etapa", dependsOnStageId: stageB._id, isBlocking: true }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("aislamiento de tenant — stage.service", () => {
  it("updateStage/publishStage/archiveStage de un admin de otro tenant -> NotFoundError", async () => {
    const { stage: stageA } = await makeTenantWithStage("svc-a");
    const { tenant: tenantB } = await makeTenantWithStage("svc-b");
    const adminB = actingAdminFor(tenantB._id);

    await expect(stageService.updateStage(adminB, stageA._id, { title: "x" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(stageService.publishStage(adminB, stageA._id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(stageService.archiveStage(adminB, stageA._id)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("aislamiento de tenant — content.repository", () => {
  it("findById/updateStatus no afectan un content_item de otro tenant", async () => {
    const { tenant: tenantA, stage: stageA } = await makeTenantWithStage("content-a");
    const { tenant: tenantB } = await makeTenantWithStage("content-b");

    const item = await contentRepository.create({
      tenantId: tenantA._id,
      stageId: stageA._id,
      type: "TEXT",
      scope: "COMMON",
      roleIds: [],
      title: "Bienvenida",
      body: "Hola",
      mediaId: null,
      videoUrl: null,
      videoProvider: null,
      requirement: null,
      order: 1,
    });

    expect(await contentRepository.findById(tenantB._id, item._id)).toBeNull();
    expect(await contentRepository.updateStatus(tenantB._id, item._id, "PUBLISHED")).toBeNull();

    const stillDraft = await contentRepository.findById(tenantA._id, item._id);
    expect(stillDraft?.status).toBe("DRAFT");
  });
});

describe("aislamiento de tenant — content.service", () => {
  it("createContentItem rechaza stageId de otro tenant", async () => {
    const { tenant: tenantA } = await makeTenantWithStage("cross-a");
    const { stage: stageB } = await makeTenantWithStage("cross-b");
    const adminA = actingAdminFor(tenantA._id);

    await expect(
      contentService.createContentItem(adminA, {
        stageId: stageB._id,
        type: "TEXT",
        scope: "COMMON",
        roleIds: [],
        title: "x",
        body: "y",
        requirement: null,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("createContentItem rechaza roleIds de otro tenant", async () => {
    const { tenant: tenantA, stage: stageA } = await makeTenantWithStage("role-a");
    const { role: roleB } = await makeTenantWithStage("role-b");
    const adminA = actingAdminFor(tenantA._id);

    await expect(
      contentService.createContentItem(adminA, {
        stageId: stageA._id,
        type: "TEXT",
        scope: "ROLE",
        roleIds: [roleB._id],
        title: "x",
        body: "y",
        requirement: null,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("publishContentItem/archiveContentItem de un admin de otro tenant -> NotFoundError", async () => {
    const { tenant: tenantA, stage: stageA } = await makeTenantWithStage("pub-a");
    const { tenant: tenantB } = await makeTenantWithStage("pub-b");
    const adminA = actingAdminFor(tenantA._id);
    const adminB = actingAdminFor(tenantB._id);

    const item = await contentService.createContentItem(adminA, {
      stageId: stageA._id,
      type: "TEXT",
      scope: "COMMON",
      roleIds: [],
      title: "x",
      body: "y",
      requirement: null,
    });

    await expect(contentService.publishContentItem(adminB, item._id)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("deleteContentItem — borrado permanente, solo sobre contenido ARCHIVED", () => {
  it("rechaza borrar un content_item en DRAFT (ValidationError)", async () => {
    const { stage } = await makeTenantWithStage("del-draft");
    const admin = actingAdminFor(stage.tenantId);

    const item = await contentService.createContentItem(admin, {
      stageId: stage._id,
      type: "TEXT",
      scope: "COMMON",
      roleIds: [],
      title: "x",
      body: "y",
      requirement: null,
    });

    await expect(contentService.deleteContentItem(admin, item._id)).rejects.toBeInstanceOf(ValidationError);
  });

  it("rechaza borrar un content_item PUBLISHED (ValidationError)", async () => {
    const { stage } = await makeTenantWithStage("del-published");
    const admin = actingAdminFor(stage.tenantId);

    const item = await contentService.createContentItem(admin, {
      stageId: stage._id,
      type: "TEXT",
      scope: "COMMON",
      roleIds: [],
      title: "x",
      body: "y",
      requirement: null,
    });
    await contentService.publishContentItem(admin, item._id);

    await expect(contentService.deleteContentItem(admin, item._id)).rejects.toBeInstanceOf(ValidationError);
  });

  it("borra permanentemente un content_item ARCHIVED", async () => {
    const { stage } = await makeTenantWithStage("del-archived");
    const admin = actingAdminFor(stage.tenantId);

    const item = await contentService.createContentItem(admin, {
      stageId: stage._id,
      type: "TEXT",
      scope: "COMMON",
      roleIds: [],
      title: "x",
      body: "y",
      requirement: null,
    });
    await contentService.publishContentItem(admin, item._id);
    await contentService.archiveContentItem(admin, item._id);

    await contentService.deleteContentItem(admin, item._id);

    expect(await contentRepository.findById(admin.tenantId, item._id)).toBeNull();
  });

  it("rechaza borrar un content_item ARCHIVED de otro tenant (NotFoundError)", async () => {
    const { tenant: tenantA, stage: stageA } = await makeTenantWithStage("del-cross-a");
    const { tenant: tenantB } = await makeTenantWithStage("del-cross-b");
    const adminA = actingAdminFor(tenantA._id);
    const adminB = actingAdminFor(tenantB._id);

    const item = await contentService.createContentItem(adminA, {
      stageId: stageA._id,
      type: "TEXT",
      scope: "COMMON",
      roleIds: [],
      title: "x",
      body: "y",
      requirement: null,
    });
    await contentService.publishContentItem(adminA, item._id);
    await contentService.archiveContentItem(adminA, item._id);

    await expect(contentService.deleteContentItem(adminB, item._id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await contentRepository.findById(adminA.tenantId, item._id)).not.toBeNull();
  });
});
