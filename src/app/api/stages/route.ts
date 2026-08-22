import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { ValidationError } from "@/server/errors";
import { createStageSchema } from "@/server/validation/stage.schema";
import { createStage, listStages } from "@/server/services/stage.service";

function serialize(stage: Awaited<ReturnType<typeof createStage>>) {
  return {
    id: stage._id.toString(),
    title: stage.title,
    key: stage.key,
    order: stage.order,
    dependsOnStageId: stage.dependsOnStageId?.toString() ?? null,
    isBlocking: stage.isBlocking,
    status: stage.status,
  };
}

export async function GET() {
  try {
    const actingAdmin = await requireAdmin();
    const stages = await listStages(actingAdmin);
    return NextResponse.json({ success: true, data: stages.map(serialize) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actingAdmin = await requireAdmin();
    const body = await request.json();
    const parsed = createStageSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Datos de etapa inválidos.", parsed.error.flatten());
    }

    const stage = await createStage(actingAdmin, {
      title: parsed.data.title,
      order: parsed.data.order,
      dependsOnStageId: parsed.data.dependsOnStageId ? new ObjectId(parsed.data.dependsOnStageId) : undefined,
      isBlocking: parsed.data.isBlocking,
    });

    return NextResponse.json({ success: true, data: serialize(stage) }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
