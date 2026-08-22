import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { ensureRoute } from "@/server/services/route.service";

// Singular: hay una sola ruta por tenant (ver decisión de Fase 3A).
export async function GET() {
  try {
    const actingAdmin = await requireAdmin();
    const route = await ensureRoute(actingAdmin);
    return NextResponse.json({
      success: true,
      data: { id: route._id.toString(), name: route.name, status: route.status },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
