import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { NotFoundError } from "@/server/errors";
import { resetOnboarding } from "@/server/services/progress.service";

// Borra todo el progreso guardado del usuario (ver progress.service.resetOnboarding)
// — vuelve a arrancar desde la primera etapa, como si nunca hubiera empezado.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actingAdmin = await requireAdmin();
    const { id } = await params;
    if (!ObjectId.isValid(id)) throw new NotFoundError();

    const result = await resetOnboarding(actingAdmin, new ObjectId(id));
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return toErrorResponse(error);
  }
}
