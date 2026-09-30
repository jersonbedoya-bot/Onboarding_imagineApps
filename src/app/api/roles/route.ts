import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { ValidationError } from "@/server/errors";
import { zodErrorMessage } from "@/lib/zod-error";
import { createRoleSchema } from "@/server/validation/role.schema";
import { createRole } from "@/server/services/role.service";
import * as roleRepository from "@/server/repositories/role.repository";

export async function GET() {
  try {
    const actingAdmin = await requireAdmin();
    const roles = await roleRepository.listByTenant(actingAdmin.tenantId);
    return NextResponse.json({
      success: true,
      data: roles.map((role) => ({ id: role._id.toString(), key: role.key, label: role.label })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actingAdmin = await requireAdmin();
    const body = await request.json();
    const parsed = createRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(zodErrorMessage(parsed.error, "Datos de rol inválidos."), parsed.error.flatten());
    }

    const role = await createRole(actingAdmin, parsed.data);
    return NextResponse.json({ success: true, data: { id: role._id.toString(), label: role.label } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
