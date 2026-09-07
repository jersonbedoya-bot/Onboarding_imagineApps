import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { NotFoundError, ValidationError } from "@/server/errors";
import { resetPasswordSchema } from "@/server/validation/user.schema";
import { resetPassword } from "@/server/services/user.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actingAdmin = await requireAdmin();
    const { id } = await params;
    if (!ObjectId.isValid(id)) throw new NotFoundError();

    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Contraseña inválida.", parsed.error.flatten());
    }

    await resetPassword(actingAdmin, new ObjectId(id), parsed.data.password);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
