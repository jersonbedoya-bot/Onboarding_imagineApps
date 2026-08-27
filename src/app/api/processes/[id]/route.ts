import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { NotFoundError, ValidationError } from "@/server/errors";
import { updateProcessSchema } from "@/server/validation/process.schema";
import { updateProcess, deleteProcess } from "@/server/services/process.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actingAdmin = await requireAdmin();
    const { id } = await params;
    if (!ObjectId.isValid(id)) throw new NotFoundError();

    const body = await request.json();
    const parsed = updateProcessSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Datos de proceso inválidos.", parsed.error.flatten());
    }

    const updated = await updateProcess(actingAdmin, new ObjectId(id), {
      scope: parsed.data.scope,
      roleIds: parsed.data.roleIds?.map((roleId) => new ObjectId(roleId)),
      title: parsed.data.title,
      objective: parsed.data.objective,
      context: parsed.data.context,
      expectedResult: parsed.data.expectedResult,
      resources: parsed.data.resources,
      order: parsed.data.order,
    });

    return NextResponse.json({ success: true, data: { id: updated._id.toString(), status: updated.status } });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actingAdmin = await requireAdmin();
    const { id } = await params;
    if (!ObjectId.isValid(id)) throw new NotFoundError();

    await deleteProcess(actingAdmin, new ObjectId(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
