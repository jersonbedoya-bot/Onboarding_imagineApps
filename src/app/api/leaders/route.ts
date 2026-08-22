import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { ValidationError } from "@/server/errors";
import { createLeaderSchema } from "@/server/validation/leader.schema";
import { createLeader, listLeaders } from "@/server/services/leader.service";
import type { LeaderDocument } from "@/server/repositories/leader.repository";

function serialize(leader: LeaderDocument) {
  return {
    id: leader._id.toString(),
    name: leader.name,
    title: leader.title,
    description: leader.description,
    photoMediaId: leader.photoMediaId?.toString() ?? null,
    videoUrl: leader.videoUrl,
    videoProvider: leader.videoProvider,
    scope: leader.scope,
    roleIds: leader.roleIds.map((id) => id.toString()),
    order: leader.order,
    status: leader.status,
  };
}

export async function GET() {
  try {
    const actingAdmin = await requireAdmin();
    const leaders = await listLeaders(actingAdmin);
    return NextResponse.json({ success: true, data: leaders.map(serialize) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actingAdmin = await requireAdmin();
    const body = await request.json();
    const parsed = createLeaderSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Datos de líder inválidos.", parsed.error.flatten());
    }

    const leader = await createLeader(actingAdmin, {
      name: parsed.data.name,
      title: parsed.data.title,
      description: parsed.data.description,
      photoMediaId: parsed.data.photoMediaId ? new ObjectId(parsed.data.photoMediaId) : undefined,
      videoUrl: parsed.data.videoUrl,
      scope: parsed.data.scope,
      roleIds: parsed.data.roleIds.map((id) => new ObjectId(id)),
      order: parsed.data.order,
    });

    return NextResponse.json({ success: true, data: serialize(leader) }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
