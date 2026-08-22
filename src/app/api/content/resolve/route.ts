import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireActiveUser } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { ValidationError } from "@/server/errors";
import { resolveVisibleContent } from "@/server/services/content.service";

/**
 * Resuelve qué contenido publicado ve un usuario, según su propio rol
 * funcional. Un ADMIN puede pasar ?roleId= para previsualizar lo que
 * vería otro rol (no se puede espiar el de otro tenant: roleId se valida
 * implícitamente porque resolveVisibleContent siempre filtra por el
 * tenantId de la sesión).
 */
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

    const result = await resolveVisibleContent(identity.tenantId, roleId);

    return NextResponse.json({
      success: true,
      data: {
        route: result.route ? { id: result.route._id.toString(), status: result.route.status } : null,
        stages: result.stages.map(({ stage, items }) => ({
          id: stage._id.toString(),
          title: stage.title,
          order: stage.order,
          items: items.map((item) => ({
            id: item._id.toString(),
            title: item.title,
            body: item.body,
            scope: item.scope,
            type: item.type,
          })),
        })),
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
