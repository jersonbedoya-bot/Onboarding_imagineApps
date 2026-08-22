import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { resolveJourney } from "@/server/services/progress.service";

// "Dónde estoy" del usuario autenticado: etapas + status derivado +
// desbloqueo + etapa actual. tenantId/userId siempre de la sesión.
export async function GET() {
  try {
    const identity = await requireActiveUser();
    const journey = await resolveJourney(identity);
    return NextResponse.json({ success: true, data: journey });
  } catch (error) {
    return toErrorResponse(error);
  }
}
