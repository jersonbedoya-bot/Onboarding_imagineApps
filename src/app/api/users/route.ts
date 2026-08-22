import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { listUsers } from "@/server/services/user.service";

export async function GET(request: Request) {
  try {
    const actingAdmin = await requireAdmin();
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "20");

    const { items, total } = await listUsers(actingAdmin, { page, pageSize });

    return NextResponse.json({
      success: true,
      data: {
        items: items.map((user) => ({
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          platformRole: user.platformRole,
          functionalRoleId: user.functionalRoleId?.toString() ?? null,
          status: user.status,
          createdAt: user.createdAt,
        })),
        total,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
