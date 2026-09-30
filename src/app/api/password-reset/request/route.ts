import { NextResponse, after } from "next/server";
import { toErrorResponse } from "@/server/errors/handler";
import { ValidationError } from "@/server/errors";
import { zodErrorMessage } from "@/lib/zod-error";
import { logger } from "@/lib/logger";
import { forgotPasswordSchema } from "@/server/validation/password-reset.schema";
import { requestPasswordReset } from "@/server/services/password-reset.service";
import { assertForgotPasswordNotRateLimited, extractIp, recordForgotPassword } from "@/server/services/rate-limit.service";

// Pública (ver proxy.ts). La respuesta es SIEMPRE la misma exista o no la
// cuenta, y el trabajo real corre en after() — si se hiciera antes de
// responder, una cuenta activa (más consultas) tardaría más que una
// inexistente, y el tiempo de respuesta delataría qué emails son reales.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(zodErrorMessage(parsed.error, "Escribe un email válido."), parsed.error.flatten());
    }

    const ip = extractIp(request);
    await assertForgotPasswordNotRateLimited(parsed.data.email, ip);
    await recordForgotPassword(parsed.data.email, ip);

    const email = parsed.data.email;
    after(async () => {
      try {
        await requestPasswordReset(email);
      } catch (error) {
        logger.error("password_reset_request_failed", { error: error instanceof Error ? error.message : String(error) });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
