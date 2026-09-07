import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { NotFoundError } from "@/server/errors";
import { revokeInvitation } from "@/server/services/invitation.service";

// Admin, por _id de Mongo (a diferencia de GET/POST accept en ../route.ts
// y ./accept, que son públicas y usan el token crudo) — ver comentario en
// ../route.ts sobre por qué el segmento se llama [id] igual.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actingAdmin = await requireAdmin();
    const { id } = await params;
    if (!ObjectId.isValid(id)) throw new NotFoundError();

    const revoked = await revokeInvitation(actingAdmin, new ObjectId(id));
    return NextResponse.json({ success: true, data: { id: revoked._id.toString(), status: revoked.status } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
