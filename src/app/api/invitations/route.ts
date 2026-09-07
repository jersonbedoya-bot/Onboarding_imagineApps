import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { ValidationError } from "@/server/errors";
import { zodErrorMessage } from "@/lib/zod-error";
import { createInvitationSchema } from "@/server/validation/invitation.schema";
import { createInvitation } from "@/server/services/invitation.service";

export async function POST(request: Request) {
  try {
    const actingAdmin = await requireAdmin();
    const body = await request.json();
    const parsed = createInvitationSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(zodErrorMessage(parsed.error, "Datos de invitación inválidos."), parsed.error.flatten());
    }

    const { link, message } = await createInvitation(actingAdmin, {
      email: parsed.data.email,
      platformRole: parsed.data.platformRole,
      functionalRoleId: parsed.data.functionalRoleId ? new ObjectId(parsed.data.functionalRoleId) : undefined,
    });

    return NextResponse.json({ success: true, data: { link, message } }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
