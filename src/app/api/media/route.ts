import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { ValidationError } from "@/server/errors";
import { uploadMedia } from "@/server/services/media.service";

export async function POST(request: Request) {
  try {
    const actingAdmin = await requireAdmin();

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new ValidationError("Falta el archivo (campo 'file').");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const media = await uploadMedia(actingAdmin, {
      buffer,
      filename: file.name,
      contentType: file.type,
    });

    return NextResponse.json(
      { success: true, data: { id: media._id.toString(), url: media.url, size: media.size } },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
