import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
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
