import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { ValidationError } from "@/server/errors";
import { AUDIT_ACTIONS, type AuditAction } from "@/server/repositories/audit.repository";
import { listAuditLog } from "@/server/services/audit.service";

// Solo ADMIN. tenantId sale de requireAdmin() — nunca del query string.
export async function GET(request: Request) {
  try {
    const actingAdmin = await requireAdmin();
    const url = new URL(request.url);

    const userIdParam = url.searchParams.get("userId");
    let userId: ObjectId | undefined;
    if (userIdParam) {
      if (!ObjectId.isValid(userIdParam)) throw new ValidationError("userId inválido.");
      userId = new ObjectId(userIdParam);
    }

    const actionParam = url.searchParams.get("action");
    let action: AuditAction | undefined;
    if (actionParam) {
      if (!AUDIT_ACTIONS.includes(actionParam as AuditAction)) throw new ValidationError("action inválida.");
      action = actionParam as AuditAction;
    }

    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
      throw new ValidationError("Rango de fecha inválido.");
    }

    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "20");

    const { items, total } = await listAuditLog(actingAdmin, { userId, action, from, to }, { page, pageSize });

    return NextResponse.json({
      success: true,
      data: {
        total,
        page,
        pageSize,
        items: items.map((item) => ({
          id: item._id.toString(),
          userId: item.userId.toString(),
          action: item.action,
          resource: item.resource,
          resourceId: item.resourceId.toString(),
          metadata: item.metadata,
          timestamp: item.timestamp,
        })),
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
