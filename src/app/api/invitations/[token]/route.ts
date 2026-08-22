import { NextResponse } from "next/server";
import { toErrorResponse } from "@/server/errors/handler";
import { previewInvitation } from "@/server/services/invitation.service";

// Pública: quien tiene el token (link compartido a mano por el admin) puede
// ver a qué invitación corresponde, antes de completar el registro.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const data = await previewInvitation(token);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
