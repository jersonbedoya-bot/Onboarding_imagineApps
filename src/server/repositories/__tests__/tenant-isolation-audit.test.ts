import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import * as tenantRepository from "@/server/repositories/tenant.repository";
import * as auditRepository from "@/server/repositories/audit.repository";
import { listAuditLog } from "@/server/services/audit.service";
import type { RequestIdentity } from "@/server/auth/session";

function adminFor(tenantId: ObjectId): RequestIdentity {
  return { userId: new ObjectId(), tenantId, status: "ACTIVE", platformRole: "ADMIN", functionalRoleId: null };
}

async function record(tenantId: ObjectId, userId: ObjectId, action: auditRepository.AuditAction) {
  await auditRepository.record({ tenantId, userId, action, resource: "content_item", resourceId: new ObjectId() });
}

describe("aislamiento de tenant — audit.repository / audit.service", () => {
  it("listAuditLog de un admin solo devuelve eventos de SU tenant", async () => {
    const tenantA = await tenantRepository.create({ name: "Tenant A", slug: "audit-a" });
    const tenantB = await tenantRepository.create({ name: "Tenant B", slug: "audit-b" });
    const adminA = adminFor(tenantA._id);
    const userInA = new ObjectId();
    const userInB = new ObjectId();

    await record(tenantA._id, userInA, "CONTENT_PUBLISHED");
    await record(tenantA._id, userInA, "STAGE_PUBLISHED");
    await record(tenantB._id, userInB, "CONTENT_PUBLISHED");

    const result = await listAuditLog(adminA, {}, {});
    expect(result.total).toBe(2);
    expect(result.items.every((item) => item.tenantId.equals(tenantA._id))).toBe(true);
  });

  it("filtra por action dentro del propio tenant", async () => {
    const tenant = await tenantRepository.create({ name: "Tenant filtro accion", slug: "audit-action" });
    const admin = adminFor(tenant._id);
    const userId = new ObjectId();

    await record(tenant._id, userId, "CONTENT_PUBLISHED");
    await record(tenant._id, userId, "CONTENT_PUBLISHED");
    await record(tenant._id, userId, "STAGE_PUBLISHED");

    const result = await listAuditLog(admin, { action: "CONTENT_PUBLISHED" }, {});
    expect(result.total).toBe(2);
    expect(result.items.every((item) => item.action === "CONTENT_PUBLISHED")).toBe(true);
  });

  it("filtra por userId dentro del propio tenant", async () => {
    const tenant = await tenantRepository.create({ name: "Tenant filtro usuario", slug: "audit-user" });
    const admin = adminFor(tenant._id);
    const userA = new ObjectId();
    const userB = new ObjectId();

    await record(tenant._id, userA, "CONTENT_PUBLISHED");
    await record(tenant._id, userB, "STAGE_PUBLISHED");

    const result = await listAuditLog(admin, { userId: userA }, {});
    expect(result.total).toBe(1);
    expect(result.items[0].userId.equals(userA)).toBe(true);
  });

  it("filtra por rango de fecha dentro del propio tenant", async () => {
    const tenant = await tenantRepository.create({ name: "Tenant filtro fecha", slug: "audit-date" });
    const admin = adminFor(tenant._id);
    const userId = new ObjectId();

    await record(tenant._id, userId, "CONTENT_PUBLISHED");

    const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
    const resultNone = await listAuditLog(admin, { from: future }, {});
    expect(resultNone.total).toBe(0);

    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
    const resultAll = await listAuditLog(admin, { from: past }, {});
    expect(resultAll.total).toBe(1);
  });

  it("pagina correctamente", async () => {
    const tenant = await tenantRepository.create({ name: "Tenant paginado", slug: "audit-page" });
    const admin = adminFor(tenant._id);
    const userId = new ObjectId();

    for (let i = 0; i < 5; i++) {
      await record(tenant._id, userId, "CONTENT_PUBLISHED");
    }

    const firstPage = await listAuditLog(admin, {}, { page: 1, pageSize: 2 });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.total).toBe(5);

    const secondPage = await listAuditLog(admin, {}, { page: 2, pageSize: 2 });
    expect(secondPage.items).toHaveLength(2);

    const firstIds = firstPage.items.map((i) => i._id.toString());
    const secondIds = secondPage.items.map((i) => i._id.toString());
    expect(firstIds.some((id) => secondIds.includes(id))).toBe(false);
  });
});
