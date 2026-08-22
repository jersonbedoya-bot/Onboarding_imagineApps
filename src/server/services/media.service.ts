import { ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";
import * as mediaRepository from "@/server/repositories/media.repository";
import * as auditRepository from "@/server/repositories/audit.repository";
import { vercelBlobProvider, type MediaProvider } from "@/server/media/provider";

// BLOQUEANTE DE DEPLOY: vercelBlobProvider (src/server/media/provider.ts) nunca
// se validó contra el servicio real — solo contra un MediaProvider fake en los
// tests de aislamiento (Fase 3B). Falta: crear el Blob store en Vercel, pegar
// BLOB_READ_WRITE_TOKEN en .env.local, y probar una subida real end-to-end
// (put() devuelve la URL esperada + queda bien persistida en la colección media).
// No hacer deploy a producción con esta ruta probada solo con mock.

// Un poco debajo del límite ~4.5MB de las funciones serverless de Vercel
// (riesgo conocido y documentado: subida server-side simple, no
// client-upload directo a Blob — ver decisión de Fase 3B / backlog).
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export async function uploadMedia(
  actingAdmin: RequestIdentity,
  input: { buffer: Buffer; filename: string; contentType: string },
  provider: MediaProvider = vercelBlobProvider,
) {
  if (!input.contentType.startsWith("image/")) {
    throw new ValidationError("Solo se pueden subir imágenes.");
  }
  if (input.buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new ValidationError(
      `El archivo supera el límite de ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB para subida server-side.`,
    );
  }

  const { url, size } = await provider.upload(input);

  const media = await mediaRepository.create({
    tenantId: actingAdmin.tenantId,
    url,
    type: "IMAGE",
    name: input.filename,
    size,
    provider: "vercel-blob",
    uploadedBy: actingAdmin.userId,
  });

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "MEDIA_UPLOADED",
    resource: "media",
    resourceId: media._id,
    metadata: { name: input.filename, size },
  });

  return media;
}
