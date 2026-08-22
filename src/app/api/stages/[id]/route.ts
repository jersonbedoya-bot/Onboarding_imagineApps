import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { NotFoundError, ValidationError } from "@/server/errors";
import { updateStageSchema } from "@/server/validation/stage.schema";
import { updateStage } from "@/server/services/stage.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actingAdmin = await requireAdmin();
    const { id } = await params;
    if (!ObjectId.isValid(id)) throw new NotFoundError();

    const body = await request.json();
    const parsed = updateStageSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Datos de etapa inválidos.", parsed.error.flatten());
    }

    const updated = await updateStage(actingAdmin, new ObjectId(id), {
      title: parsed.data.title,
      order: parsed.data.order,
      dependsOnStageId:
        parsed.data.dependsOnStageId === undefined
          ? undefined
          : parsed.data.dependsOnStageId === null
            ? null
            : new ObjectId(parsed.data.dependsOnStageId),
      isBlocking: parsed.data.isBlocking,
    });

    return NextResponse.json({
      success: true,
      data: { id: updated._id.toString(), title: updated.title, order: updated.order, status: updated.status },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
