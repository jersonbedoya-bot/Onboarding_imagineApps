import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import * as tenantRepository from "@/server/repositories/tenant.repository";
import * as roleRepository from "@/server/repositories/role.repository";
import * as routeService from "@/server/services/route.service";
import * as stageService from "@/server/services/stage.service";
import * as contentService from "@/server/services/content.service";
import * as progressService from "@/server/services/progress.service";
import type { RequestIdentity } from "@/server/auth/session";

/**
 * Misma forma que el onboarding real de Imagine Apps (verificado sobre los
 * datos de Atlas): el módulo 1 "Bienvenidos" solo tiene contenido
 * INFORMATIONAL (nada obligatorio, sin procesos) y el módulo 2 sí tiene
 * contenido obligatorio.
 */
async function makeRealShapedJourney(suffix: string) {
  const tenant = await tenantRepository.create({ name: `Tenant ${suffix}`, slug: `tenant-firstday-${suffix}` });
  const role = await roleRepository.create({ tenantId: tenant._id, key: "PDM", label: "PDM" });
  const admin: RequestIdentity = { userId: new ObjectId(), tenantId: tenant._id, status: "ACTIVE", platformRole: "ADMIN", functionalRoleId: null };

  await routeService.publishRoute(admin);
  const welcome = await stageService.createStage(admin, { title: `Bienvenidos ${suffix}`, isBlocking: true });
  await stageService.publishStage(admin, welcome._id);
  const dayToDay = await stageService.createStage(admin, { title: `Tu Día a Día ${suffix}`, isBlocking: true });
  await stageService.publishStage(admin, dayToDay._id);

  const history = await contentService.createContentItem(admin, {
    stageId: welcome._id,
    type: "TEXT",
    scope: "COMMON",
    roleIds: [],
    title: "Nuestra Historia",
    body: "cuerpo",
    requirement: "INFORMATIONAL",
  });
  await contentService.publishContentItem(admin, history._id);

  const policy = await contentService.createContentItem(admin, {
    stageId: dayToDay._id,
    type: "TEXT",
    scope: "COMMON",
    roleIds: [],
    title: "Política obligatoria",
    body: "cuerpo",
    requirement: "OBLIGATORY",
  });
  await contentService.publishContentItem(admin, policy._id);

  return { tenant, role, welcome, dayToDay };
}

describe("primer ingreso de un Imaginer", () => {
  it("una persona sin ningún avance empieza en el módulo 1, aunque ese módulo no tenga nada obligatorio", async () => {
    const { tenant, role, welcome } = await makeRealShapedJourney("new");
    const journey = await progressService.resolveJourneyFor(tenant._id, new ObjectId(), role._id);

    expect(journey.currentStageId).toBe(welcome._id.toString());
  });

  it("apenas guarda su primer avance, sigue la regla normal y pasa al primer módulo pendiente", async () => {
    const { tenant, role, dayToDay } = await makeRealShapedJourney("started");
    const userId = new ObjectId();
    const user: RequestIdentity = { userId, tenantId: tenant._id, status: "ACTIVE", platformRole: "USER", functionalRoleId: role._id };
    const before = await progressService.resolveJourneyFor(tenant._id, userId, role._id);
    const policyId = before.stages[1].items[0].id;

    await progressService.markContentAsRead(user, new ObjectId(policyId));
    const after = await progressService.resolveJourneyFor(tenant._id, userId, role._id);

    // Módulo 2 ya completo (su único obligatorio está leído) → terminado.
    expect(after.currentStageId).toBeNull();
    expect(after.stages.find((s) => s.id === dayToDay._id.toString())?.status).toBe("COMPLETE");
  });

  it("el módulo 2 sigue desbloqueado desde el inicio (el módulo 1 sin obligatorios no frena a nadie)", async () => {
    const { tenant, role, dayToDay } = await makeRealShapedJourney("unlock");
    const journey = await progressService.resolveJourneyFor(tenant._id, new ObjectId(), role._id);

    expect(journey.stages.find((s) => s.id === dayToDay._id.toString())?.unlocked).toBe(true);
  });
});
