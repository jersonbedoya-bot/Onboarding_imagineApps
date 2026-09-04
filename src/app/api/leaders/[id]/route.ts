import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin, requireContentEditor } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { NotFoundError, ValidationError } from "@/server/errors";
import { updateLeaderSchema } from "@/server/validation/leader.schema";
import { updateLeader, deleteLeader } from "@/server/services/leader.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actingAdmin = await requireContentEditor();
    const { id } = await params;
    if (!ObjectId.isValid(id)) throw new NotFoundError();

    const body = await request.json();
    const parsed = updateLeaderSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Datos de líder inválidos.", parsed.error.flatten());
    }

    const updated = await updateLeader(actingAdmin, new ObjectId(id), {
      name: parsed.data.name,
      title: parsed.data.title,
      description: parsed.data.description,
      photoMediaId:
        parsed.data.photoMediaId === undefined ? undefined : parsed.data.photoMediaId ? new ObjectId(parsed.data.photoMediaId) : null,
      videoUrl: parsed.data.videoUrl,
      scope: parsed.data.scope,
      roleIds: parsed.data.roleIds?.map((roleId) => new ObjectId(roleId)),
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

    await deleteLeader(actingAdmin, new ObjectId(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
