import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { archiveRoute } from "@/server/services/route.service";

export async function POST() {
  try {
    const actingAdmin = await requireAdmin();
    const route = await archiveRoute(actingAdmin);
    return NextResponse.json({ success: true, data: { id: route._id.toString(), status: route.status } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
