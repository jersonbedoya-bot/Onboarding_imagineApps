import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { ValidationError } from "@/server/errors";
import { ensureRoute, updateRouteContent } from "@/server/services/route.service";
import { updateRouteContentSchema } from "@/server/validation/route.schema";

// Singular: hay una sola ruta por tenant (ver decisión de Fase 3A).
export async function GET() {
  try {
    const actingAdmin = await requireAdmin();
    const route = await ensureRoute(actingAdmin);
    return NextResponse.json({
      success: true,
      data: {
        id: route._id.toString(),
        name: route.name,
        status: route.status,
        headline: route.headline ?? null,
        subtitle: route.subtitle ?? null,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Edita el título/subtítulo del header de /onboarding — ver route.service.getRouteHeader. */
export async function PATCH(request: Request) {
  try {
    const actingAdmin = await requireAdmin();
    const body = await request.json();
    const parsed = updateRouteContentSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Datos de título/subtítulo inválidos.", parsed.error.flatten());
    }
    const route = await updateRouteContent(actingAdmin, parsed.data);
    return NextResponse.json({
      success: true,
      data: { id: route._id.toString(), headline: route.headline ?? null, subtitle: route.subtitle ?? null },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
