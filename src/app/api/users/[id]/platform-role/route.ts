import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { NotFoundError, ValidationError } from "@/server/errors";
import { changePlatformRoleSchema } from "@/server/validation/user.schema";
import { changePlatformRole } from "@/server/services/user.service";

// Cambiar el NIVEL DE ACCESO (USER/EDITOR/ADMIN) — distinto de PATCH
// /api/users/{id}/role, que solo cambia el rol funcional (PDM/UX-UI).
// Siempre requireAdmin: un EDITOR no puede tocar el nivel de acceso de
// nadie, ni siquiera el suyo propio.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actingAdmin = await requireAdmin();
    const { id } = await params;
    if (!ObjectId.isValid(id)) throw new NotFoundError();

    const body = await request.json();
    const parsed = changePlatformRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Nivel de acceso inválido.", parsed.error.flatten());
    }

    const updated = await changePlatformRole(actingAdmin, new ObjectId(id), {
      platformRole: parsed.data.platformRole,
      functionalRoleId: parsed.data.functionalRoleId ? new ObjectId(parsed.data.functionalRoleId) : undefined,
    });
    return NextResponse.json({
      success: true,
      data: { id: updated._id.toString(), platformRole: updated.platformRole, functionalRoleId: updated.functionalRoleId?.toString() ?? null },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
