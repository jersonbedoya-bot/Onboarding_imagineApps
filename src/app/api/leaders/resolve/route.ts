import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireActiveUser } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { ValidationError } from "@/server/errors";
import { resolveVisibleLeaders } from "@/server/services/leader.service";

// Mismo patrón que /api/content/resolve: un USER resuelve su propio rol;
// un ADMIN puede pasar ?roleId= para previsualizar el de otro rol.
export async function GET(request: Request) {
  try {
    const identity = await requireActiveUser();
    const url = new URL(request.url);
    const roleIdParam = url.searchParams.get("roleId");

    let roleId: ObjectId;
    if (identity.platformRole === "ADMIN" && roleIdParam) {
      if (!ObjectId.isValid(roleIdParam)) throw new ValidationError("roleId inválido.");
      roleId = new ObjectId(roleIdParam);
    } else if (identity.functionalRoleId) {
      roleId = identity.functionalRoleId;
    } else {
      throw new ValidationError("No tenés un rol funcional asignado.");
    }

    const leaders = await resolveVisibleLeaders(identity.tenantId, roleId);

    return NextResponse.json({
      success: true,
      data: leaders.map((leader) => ({
        id: leader._id.toString(),
        name: leader.name,
        title: leader.title,
        videoUrl: leader.videoUrl,
        videoProvider: leader.videoProvider,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
