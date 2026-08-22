import type { ObjectId } from "mongodb";
import type { RequestIdentity } from "@/server/auth/session";
import type { AuditAction } from "@/server/repositories/audit.repository";
import * as auditRepository from "@/server/repositories/audit.repository";

const DEFAULT_PAGE_SIZE = 20;

/**
 * tenantId sale SIEMPRE de actingAdmin (requireAdmin en el route
 * handler) — un admin nunca puede pedir la auditoría de otro tenant, ni
 * pasándolo por query param.
 */
export async function listAuditLog(
  actingAdmin: RequestIdentity,
  filters: { userId?: ObjectId; action?: AuditAction; from?: Date; to?: Date },
  pagination: { page?: number; pageSize?: number },
) {
  const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize = pagination.pageSize && pagination.pageSize > 0 ? pagination.pageSize : DEFAULT_PAGE_SIZE;
  return auditRepository.listByTenant(actingAdmin.tenantId, filters, { page, pageSize });
}
