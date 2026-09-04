import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireContentEditor } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { ValidationError } from "@/server/errors";
import { createContentItemSchema } from "@/server/validation/content.schema";
import { createContentItem, listContentByStage } from "@/server/services/content.service";
import type { ContentItemDocument } from "@/server/repositories/content.repository";

function serialize(item: ContentItemDocument) {
  return {
    id: item._id.toString(),
    stageId: item.stageId.toString(),
    type: item.type,
    scope: item.scope,
    roleIds: item.roleIds.map((id) => id.toString()),
    title: item.title,
    body: item.body,
    mediaId: item.mediaId?.toString() ?? null,
    videoUrl: item.videoUrl,
    videoProvider: item.videoProvider,
    requirement: item.requirement,
    order: item.order,
    status: item.status,
  };
}

export async function GET(request: Request) {
  try {
    const actingAdmin = await requireContentEditor();
    const url = new URL(request.url);
    const stageId = url.searchParams.get("stageId");
    if (!stageId || !ObjectId.isValid(stageId)) {
      throw new ValidationError("Query param stageId requerido y válido.");
    }

    const items = await listContentByStage(actingAdmin, new ObjectId(stageId));
    return NextResponse.json({ success: true, data: items.map(serialize) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actingAdmin = await requireContentEditor();
    const body = await request.json();
    const parsed = createContentItemSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Datos de contenido inválidos.", parsed.error.flatten());
    }

    const item = await createContentItem(actingAdmin, {
      stageId: new ObjectId(parsed.data.stageId),
      type: parsed.data.type,
      scope: parsed.data.scope,
      roleIds: parsed.data.roleIds.map((id) => new ObjectId(id)),
      title: parsed.data.title,
      body: parsed.data.body,
      mediaId: parsed.data.mediaId ? new ObjectId(parsed.data.mediaId) : undefined,
      videoUrl: parsed.data.videoUrl,
      requirement: parsed.data.requirement,
      order: parsed.data.order,
    });

    return NextResponse.json({ success: true, data: serialize(item) }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
