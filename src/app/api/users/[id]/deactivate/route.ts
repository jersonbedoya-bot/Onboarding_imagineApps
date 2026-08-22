import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { NotFoundError } from "@/server/errors";
import { deactivateUser } from "@/server/services/user.service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actingAdmin = await requireAdmin();
    const { id } = await params;
    if (!ObjectId.isValid(id)) throw new NotFoundError();

    const updated = await deactivateUser(actingAdmin, new ObjectId(id));
    return NextResponse.json({ success: true, data: { id: updated._id.toString(), status: updated.status } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
