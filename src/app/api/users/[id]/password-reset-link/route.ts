import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { NotFoundError } from "@/server/errors";
import { createPasswordResetLink } from "@/server/services/password-reset.service";

// El link/mensaje se devuelve UNA sola vez (el token crudo no se guarda).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actingAdmin = await requireAdmin();
    const { id } = await params;
    if (!ObjectId.isValid(id)) throw new NotFoundError();

    const { link, message, expiresAt } = await createPasswordResetLink(actingAdmin, new ObjectId(id));
    return NextResponse.json({ success: true, data: { link, message, expiresAt } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
