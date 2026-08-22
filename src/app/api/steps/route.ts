import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { ValidationError } from "@/server/errors";
import { createStepSchema } from "@/server/validation/step.schema";
import { createStep, listStepsByProcess } from "@/server/services/step.service";
import type { StepDocument } from "@/server/repositories/step.repository";

function serialize(step: StepDocument) {
  return {
    id: step._id.toString(),
    processId: step.processId.toString(),
    title: step.title,
    description: step.description,
    instruction: step.instruction,
    resources: step.resources,
    videoUrl: step.videoUrl,
    videoProvider: step.videoProvider,
    links: step.links,
    completionCriteria: step.completionCriteria,
    order: step.order,
    status: step.status,
  };
}

export async function GET(request: Request) {
  try {
    const actingAdmin = await requireAdmin();
    const url = new URL(request.url);
    const processId = url.searchParams.get("processId");
    if (!processId || !ObjectId.isValid(processId)) {
      throw new ValidationError("Query param processId requerido y válido.");
    }

    const steps = await listStepsByProcess(actingAdmin, new ObjectId(processId));
    return NextResponse.json({ success: true, data: steps.map(serialize) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actingAdmin = await requireAdmin();
    const body = await request.json();
    const parsed = createStepSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Datos de paso inválidos.", parsed.error.flatten());
    }

    const step = await createStep(actingAdmin, {
      processId: new ObjectId(parsed.data.processId),
      title: parsed.data.title,
      description: parsed.data.description,
      instruction: parsed.data.instruction,
      resources: parsed.data.resources,
      videoUrl: parsed.data.videoUrl,
      links: parsed.data.links,
      completionCriteria: parsed.data.completionCriteria,
      order: parsed.data.order,
    });

    return NextResponse.json({ success: true, data: serialize(step) }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
