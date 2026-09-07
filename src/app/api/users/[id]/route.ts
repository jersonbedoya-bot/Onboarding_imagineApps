import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { NotFoundError } from "@/server/errors";
import { deleteUser } from "@/server/services/user.service";

// Borrado permanente — solo permitido sobre un user ya INACTIVE (ver
// user.service.deleteUser, mismo flujo de 2 pasos que content/stage/leader/
// process/step: desactivar->borrar, nunca de un tirón).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actingAdmin = await requireAdmin();
    const { id } = await params;
    if (!ObjectId.isValid(id)) throw new NotFoundError();

    await deleteUser(actingAdmin, new ObjectId(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
