import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { NotFoundError, ValidationError } from "@/server/errors";
import { updateContentItemSchema } from "@/server/validation/content.schema";
import { updateContentItem } from "@/server/services/content.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actingAdmin = await requireAdmin();
    const { id } = await params;
    if (!ObjectId.isValid(id)) throw new NotFoundError();

    const body = await request.json();
    const parsed = updateContentItemSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Datos de contenido inválidos.", parsed.error.flatten());
    }

    const updated = await updateContentItem(actingAdmin, new ObjectId(id), {
      type: parsed.data.type,
      scope: parsed.data.scope,
      roleIds: parsed.data.roleIds?.map((roleId) => new ObjectId(roleId)),
      title: parsed.data.title,
      body: parsed.data.body,
      requirement: parsed.data.requirement,
      order: parsed.data.order,
    });

    return NextResponse.json({
      success: true,
      data: { id: updated._id.toString(), title: updated.title, status: updated.status },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
