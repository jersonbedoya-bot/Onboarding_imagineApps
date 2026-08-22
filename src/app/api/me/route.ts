/**
 * ENDPOINT DE DIAGNÓSTICO TEMPORAL — Fase 1.
 *
 * No es parte del producto final. Existe únicamente para validar, con
 * curl, que requireActiveUser() resuelve la identidad desde Mongo en
 * cada request y que una desactivación es inmediata (no espera a que
 * expire el JWT). Se puede borrar una vez que exista una página o
 * endpoint real que dependa del mismo guard (Fase 2 en adelante).
 */
import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";

export async function GET() {
  try {
    const identity = await requireActiveUser();
    return NextResponse.json({
      success: true,
      data: {
        userId: identity.userId.toString(),
        tenantId: identity.tenantId.toString(),
        status: identity.status,
        platformRole: identity.platformRole,
        functionalRoleId: identity.functionalRoleId?.toString() ?? null,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
