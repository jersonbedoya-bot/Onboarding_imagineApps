import { NextResponse } from "next/server";
import { toErrorResponse } from "@/server/errors/handler";
import { previewInvitation } from "@/server/services/invitation.service";

// Pública: quien tiene el token (link compartido a mano por el admin) puede
// ver a qué invitación corresponde, antes de completar el registro.
//
// El segmento de carpeta se llama [id] (no [token]) por una razón puramente
// de ruteo: Next.js no permite dos nombres distintos de segmento dinámico
// en la misma posición del árbol (acá conviven este GET/accept, públicos
// por token, con POST .../revoke, admin, por _id de Mongo) — el nombre de
// la carpeta no cambia la URL ni lo que viaja acá, que sigue siendo el
// token crudo.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: token } = await params;
    const data = await previewInvitation(token);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
