import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { NotFoundError, ValidationError } from "@/server/errors";
import { updateStepSchema } from "@/server/validation/step.schema";
import { updateStep } from "@/server/services/step.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actingAdmin = await requireAdmin();
    const { id } = await params;
    if (!ObjectId.isValid(id)) throw new NotFoundError();

    const body = await request.json();
    const parsed = updateStepSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Datos de paso inválidos.", parsed.error.flatten());
    }

    const updated = await updateStep(actingAdmin, new ObjectId(id), parsed.data);
    return NextResponse.json({ success: true, data: { id: updated._id.toString(), status: updated.status } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
