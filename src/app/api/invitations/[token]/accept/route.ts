import { NextResponse } from "next/server";
import { toErrorResponse } from "@/server/errors/handler";
import { ValidationError } from "@/server/errors";
import { acceptInvitationSchema } from "@/server/validation/invitation.schema";
import { acceptInvitation } from "@/server/services/invitation.service";

// Pública: el tenantId y el rol del nuevo user salen SIEMPRE de la
// invitación (ver invitation.service), nunca del body de este request.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await request.json();
    const parsed = acceptInvitationSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Datos de registro inválidos.", parsed.error.flatten());
    }

    const result = await acceptInvitation(token, parsed.data);
    return NextResponse.json({ success: true, data: { userId: result.userId.toString() } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
