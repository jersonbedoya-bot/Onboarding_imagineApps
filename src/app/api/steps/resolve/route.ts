import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireActiveUser } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { ValidationError } from "@/server/errors";
import { resolveVisibleSteps } from "@/server/services/step.service";

// Mismo patrón que /api/content/resolve.
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

    const result = await resolveVisibleSteps(identity.tenantId, roleId);

    return NextResponse.json({
      success: true,
      data: {
        processes: result.processes.map(({ process, steps }) => ({
          id: process._id.toString(),
          title: process.title,
          status: process.status,
          steps: steps.map((step) => ({ id: step._id.toString(), title: step.title })),
        })),
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
