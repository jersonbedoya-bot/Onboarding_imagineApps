import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { NotFoundError, ValidationError } from "@/server/errors";
import { changeFunctionalRoleSchema } from "@/server/validation/user.schema";
import { changeFunctionalRole } from "@/server/services/user.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actingAdmin = await requireAdmin();
    const { id } = await params;
    if (!ObjectId.isValid(id)) throw new NotFoundError();

    const body = await request.json();
    const parsed = changeFunctionalRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Rol funcional inválido.", parsed.error.flatten());
    }

    const updated = await changeFunctionalRole(actingAdmin, new ObjectId(id), new ObjectId(parsed.data.functionalRoleId));
    return NextResponse.json({
      success: true,
      data: { id: updated._id.toString(), functionalRoleId: updated.functionalRoleId?.toString() ?? null },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
