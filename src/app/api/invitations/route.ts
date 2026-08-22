import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { ValidationError } from "@/server/errors";
import { createInvitationSchema } from "@/server/validation/invitation.schema";
import { createInvitation } from "@/server/services/invitation.service";

export async function POST(request: Request) {
  try {
    const actingAdmin = await requireAdmin();
    const body = await request.json();
    const parsed = createInvitationSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Datos de invitación inválidos.", parsed.error.flatten());
    }

    const { link, message } = await createInvitation(actingAdmin, {
      email: parsed.data.email,
      functionalRoleId: new ObjectId(parsed.data.functionalRoleId),
    });

    return NextResponse.json({ success: true, data: { link, message } }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
