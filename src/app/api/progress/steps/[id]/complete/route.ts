import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireActiveUser } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { NotFoundError } from "@/server/errors";
import { completeStep } from "@/server/services/progress.service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await requireActiveUser();
    const { id } = await params;
    if (!ObjectId.isValid(id)) throw new NotFoundError();

    await completeStep(identity, new ObjectId(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
