import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { NotFoundError, ValidationError } from "@/server/errors";
import { zodErrorMessage } from "@/lib/zod-error";
import { renameRoleSchema } from "@/server/validation/role.schema";
import { renameRole } from "@/server/services/role.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actingAdmin = await requireAdmin();
    const { id } = await params;
    if (!ObjectId.isValid(id)) throw new NotFoundError();

    const body = await request.json();
    const parsed = renameRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(zodErrorMessage(parsed.error, "Datos de rol inválidos."), parsed.error.flatten());
    }

    const updated = await renameRole(actingAdmin, new ObjectId(id), parsed.data.label);
    return NextResponse.json({ success: true, data: { id: updated._id.toString(), label: updated.label } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
