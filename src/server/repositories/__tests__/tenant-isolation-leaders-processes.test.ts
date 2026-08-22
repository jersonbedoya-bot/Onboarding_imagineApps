import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import * as tenantRepository from "@/server/repositories/tenant.repository";
import * as roleRepository from "@/server/repositories/role.repository";
import * as routeRepository from "@/server/repositories/route.repository";
import * as stageRepository from "@/server/repositories/stage.repository";
import * as leaderRepository from "@/server/repositories/leader.repository";
import * as processRepository from "@/server/repositories/process.repository";
import * as stepRepository from "@/server/repositories/step.repository";
import * as mediaRepository from "@/server/repositories/media.repository";
import * as leaderService from "@/server/services/leader.service";
import * as processService from "@/server/services/process.service";
import * as stepService from "@/server/services/step.service";
import * as routeService from "@/server/services/route.service";
import * as stageService from "@/server/services/stage.service";
import { uploadMedia } from "@/server/services/media.service";
import { NotFoundError, ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";
import type { MediaProvider } from "@/server/media/provider";

async function makeTenantWithStage(suffix: string) {
  const tenant = await tenantRepository.create({ name: `Tenant ${suffix}`, slug: `tenant-lp-${suffix}` });
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
  const admin: RequestIdentity = {
    userId: new ObjectId(),
    tenantId: tenant._id,
    status: "ACTIVE",
    platformRole: "ADMIN",
    functionalRoleId: null,
  };
  return { tenant, role, route, stage, admin };
}

const fakeMediaProvider: MediaProvider = {
  async upload({ buffer, filename }) {
    return { url: `https://fake-blob.test/${filename}`, size: buffer.byteLength };
  },
};

describe("aislamiento de tenant — leader.repository / leader.service", () => {
  it("findById no devuelve un líder de otro tenant", async () => {
    const { tenant: tenantA, admin: adminA } = await makeTenantWithStage("leader-a");
    const { tenant: tenantB } = await makeTenantWithStage("leader-b");

    const leader = await leaderService.createLeader(adminA, {
      name: "Ana",
      title: "CTO",
      description: "",
      scope: "COMMON",
      roleIds: [],
    });

    expect(await leaderRepository.findById(tenantB._id, leader._id)).toBeNull();
    expect(leader.tenantId.toString()).toBe(tenantA._id.toString());
  });

  it("publishLeader de un admin de otro tenant -> NotFoundError", async () => {
    const { admin: adminA } = await makeTenantWithStage("leader-c");
    const { admin: adminB } = await makeTenantWithStage("leader-d");

    const leader = await leaderService.createLeader(adminA, {
      name: "Bruno",
      title: "PM",
      description: "",
      scope: "COMMON",
      roleIds: [],
    });

    await expect(leaderService.publishLeader(adminB, leader._id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("createLeader rechaza roleIds de otro tenant", async () => {
    const { admin: adminA } = await makeTenantWithStage("leader-e");
    const { role: roleB } = await makeTenantWithStage("leader-f");

    await expect(
      leaderService.createLeader(adminA, { name: "x", title: "y", description: "", scope: "ROLE", roleIds: [roleB._id] }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("aislamiento de tenant — process.repository / process.service", () => {
  it("createProcess rechaza stageId de otro tenant", async () => {
    const { admin: adminA } = await makeTenantWithStage("proc-a");
    const { stage: stageB } = await makeTenantWithStage("proc-b");

    await expect(
      processService.createProcess(adminA, {
        stageId: stageB._id,
        scope: "COMMON",
        roleIds: [],
        title: "x",
        objective: "",
        context: "",
        expectedResult: "",
        resources: [],
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("publishProcess/archiveProcess de un admin de otro tenant -> NotFoundError", async () => {
    const { admin: adminA, stage: stageA } = await makeTenantWithStage("proc-c");
    const { admin: adminB } = await makeTenantWithStage("proc-d");

    const process = await processService.createProcess(adminA, {
      stageId: stageA._id,
      scope: "COMMON",
      roleIds: [],
      title: "x",
      objective: "",
      context: "",
      expectedResult: "",
      resources: [],
    });

    await expect(processService.publishProcess(adminB, process._id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await processRepository.findById(adminB.tenantId, process._id)).toBeNull();
  });
});

describe("aislamiento de tenant — step.repository / step.service", () => {
  it("createStep rechaza processId de otro tenant", async () => {
    const { admin: adminA, stage: stageA } = await makeTenantWithStage("step-a");
    const { admin: adminB, stage: stageB } = await makeTenantWithStage("step-b");

    const processB = await processService.createProcess(adminB, {
      stageId: stageB._id,
      scope: "COMMON",
      roleIds: [],
      title: "x",
      objective: "",
      context: "",
      expectedResult: "",
      resources: [],
    });

    await expect(
      stepService.createStep(adminA, {
        processId: processB._id,
        title: "x",
        description: "",
        instruction: "",
        resources: [],
        links: [],
        completionCriteria: "",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    void stageA;
  });

  it("publishStep de un admin de otro tenant -> NotFoundError", async () => {
    const { admin: adminA, stage: stageA } = await makeTenantWithStage("step-c");
    const { admin: adminB } = await makeTenantWithStage("step-d");

    const process = await processService.createProcess(adminA, {
      stageId: stageA._id,
      scope: "COMMON",
      roleIds: [],
      title: "x",
      objective: "",
      context: "",
      expectedResult: "",
      resources: [],
    });
    const step = await stepService.createStep(adminA, {
      processId: process._id,
      title: "x",
      description: "",
      instruction: "",
      resources: [],
      links: [],
      completionCriteria: "",
    });

    await expect(stepService.publishStep(adminB, step._id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await stepRepository.findById(adminB.tenantId, step._id)).toBeNull();
  });

  it("cascada: un proceso archivado oculta sus pasos aunque los pasos sigan PUBLISHED", async () => {
    const { admin, stage, tenant, role } = await makeTenantWithStage("cascade-a");

    const process = await processService.createProcess(admin, {
      stageId: stage._id,
      scope: "COMMON",
      roleIds: [],
      title: "Proceso con pasos",
      objective: "",
      context: "",
      expectedResult: "",
      resources: [],
    });
    const step = await stepService.createStep(admin, {
      processId: process._id,
      title: "Paso 1",
      description: "",
      instruction: "",
      resources: [],
      links: [],
      completionCriteria: "",
    });

    await routeService.publishRoute(admin);
    await stageService.publishStage(admin, stage._id);
    await processService.publishProcess(admin, process._id);
    await stepService.publishStep(admin, step._id);

    const visibleBefore = await stepService.resolveVisibleSteps(tenant._id, role._id);
    expect(visibleBefore.processes.flatMap((p) => p.steps.map((s) => s._id.toString()))).toContain(step._id.toString());

    await processService.archiveProcess(admin, process._id);

    const visibleAfter = await stepService.resolveVisibleSteps(tenant._id, role._id);
    const stillVisible = visibleAfter.processes.flatMap((p) => p.steps.map((s) => s._id.toString()));
    expect(stillVisible).not.toContain(step._id.toString());

    // El paso en sí sigue PUBLISHED — lo que cambió es el status del proceso.
    const stepDoc = await stepRepository.findById(tenant._id, step._id);
    expect(stepDoc?.status).toBe("PUBLISHED");
  });
});

describe("aislamiento de tenant — media.repository / media.service", () => {
  it("findById no devuelve un media de otro tenant", async () => {
    const { admin: adminA } = await makeTenantWithStage("media-a");
    const { tenant: tenantB } = await makeTenantWithStage("media-b");

    const media = await uploadMedia(
      adminA,
      { buffer: Buffer.from("fake-image-bytes"), filename: "foto.png", contentType: "image/png" },
      fakeMediaProvider,
    );

    expect(await mediaRepository.findById(tenantB._id, media._id)).toBeNull();
    expect(media.tenantId.toString()).toBe(adminA.tenantId.toString());
  });

  it("rechaza archivos que no son imagen", async () => {
    const { admin } = await makeTenantWithStage("media-c");

    await expect(
      uploadMedia(admin, { buffer: Buffer.from("pdf-bytes"), filename: "doc.pdf", contentType: "application/pdf" }, fakeMediaProvider),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rechaza archivos que superan el límite de tamaño", async () => {
    const { admin } = await makeTenantWithStage("media-d");
    const oversized = Buffer.alloc(5 * 1024 * 1024); // 5MB > límite de 4MB

    await expect(
      uploadMedia(admin, { buffer: oversized, filename: "grande.png", contentType: "image/png" }, fakeMediaProvider),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
