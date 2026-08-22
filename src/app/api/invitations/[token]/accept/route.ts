import { NextResponse } from "next/server";
import { toErrorResponse } from "@/server/errors/handler";
import { RateLimitedError, ValidationError } from "@/server/errors";
import { acceptInvitationSchema } from "@/server/validation/invitation.schema";
import { acceptInvitation } from "@/server/services/invitation.service";
import { assertAcceptInviteNotRateLimited, recordFailedAcceptInvite } from "@/server/services/rate-limit.service";

// Pública: el tenantId y el rol del nuevo user salen SIEMPRE de la
// invitación (ver invitation.service), nunca del body de este request.
// Rate limit por token: un token válido no debería fallar, varios fallos
// contra el mismo token son un patrón de abuso/fuzzing del endpoint.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  try {
    await assertAcceptInviteNotRateLimited(token);

    const body = await request.json();
    const parsed = acceptInvitationSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Datos de registro inválidos.", parsed.error.flatten());
    }

    const result = await acceptInvitation(token, parsed.data);
    return NextResponse.json({ success: true, data: { userId: result.userId.toString() } });
  } catch (error) {
    // No sumar otro intento cuando el rechazo YA fue por rate limit —
    // no aporta nada, esa clave ya está bloqueada.
    if (!(error instanceof RateLimitedError)) {
      await recordFailedAcceptInvite(token);
    }
    return toErrorResponse(error);
  }
}
