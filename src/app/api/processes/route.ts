import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { ValidationError } from "@/server/errors";
import { createProcessSchema } from "@/server/validation/process.schema";
import { createProcess, listProcessesByStage } from "@/server/services/process.service";
import type { ProcessDocument } from "@/server/repositories/process.repository";

function serialize(process: ProcessDocument) {
  return {
    id: process._id.toString(),
    stageId: process.stageId.toString(),
    scope: process.scope,
    roleIds: process.roleIds.map((id) => id.toString()),
    title: process.title,
    objective: process.objective,
    context: process.context,
    expectedResult: process.expectedResult,
    resources: process.resources,
    order: process.order,
    status: process.status,
  };
}

export async function GET(request: Request) {
  try {
    const actingAdmin = await requireAdmin();
    const url = new URL(request.url);
    const stageId = url.searchParams.get("stageId");
    if (!stageId || !ObjectId.isValid(stageId)) {
      throw new ValidationError("Query param stageId requerido y válido.");
    }

    const processes = await listProcessesByStage(actingAdmin, new ObjectId(stageId));
    return NextResponse.json({ success: true, data: processes.map(serialize) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actingAdmin = await requireAdmin();
    const body = await request.json();
    const parsed = createProcessSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Datos de proceso inválidos.", parsed.error.flatten());
    }

    const process = await createProcess(actingAdmin, {
      stageId: new ObjectId(parsed.data.stageId),
      scope: parsed.data.scope,
      roleIds: parsed.data.roleIds.map((id) => new ObjectId(id)),
      title: parsed.data.title,
      objective: parsed.data.objective,
      context: parsed.data.context,
      expectedResult: parsed.data.expectedResult,
      resources: parsed.data.resources,
      order: parsed.data.order,
    });

    return NextResponse.json({ success: true, data: serialize(process) }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
