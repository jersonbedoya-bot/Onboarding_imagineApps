import { NextResponse } from "next/server";
import { toErrorResponse } from "@/server/errors/handler";
import { RateLimitedError, ValidationError } from "@/server/errors";
import { zodErrorMessage } from "@/lib/zod-error";
import { completePasswordResetSchema } from "@/server/validation/password-reset.schema";
import { completePasswordReset } from "@/server/services/password-reset.service";
import { assertResetPasswordNotRateLimited, extractIp, recordFailedResetPassword } from "@/server/services/rate-limit.service";

// Pública (ver proxy.ts): quien tiene el link elige su nueva contraseña.
// Rate limit por token, mismo criterio que /api/invitations/[id]/accept.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ip = extractIp(request);

  try {
    await assertResetPasswordNotRateLimited(token, ip);

    const body = await request.json();
    const parsed = completePasswordResetSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(zodErrorMessage(parsed.error, "La contraseña no cumple los requisitos."), parsed.error.flatten());
    }

    await completePasswordReset(token, parsed.data.password);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (!(error instanceof RateLimitedError) && !(error instanceof ValidationError)) {
      await recordFailedResetPassword(token, ip);
    }
    return toErrorResponse(error);
  }
}
