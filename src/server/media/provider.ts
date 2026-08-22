import { put } from "@vercel/blob";

export type UploadInput = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};

export type UploadResult = {
  url: string;
  size: number;
};

/**
 * Contrato mínimo detrás del que vive el proveedor de storage (regla 54
 * del PRD: la arquitectura debe permitir cambiar de proveedor). Hoy solo
 * hay una implementación (Vercel Blob), pero media.service la recibe
 * inyectada, no importada directo — así se puede testear sin credenciales
 * reales y cambiar de proveedor sin tocar la lógica de negocio.
 */
export type MediaProvider = {
  upload(input: UploadInput): Promise<UploadResult>;
};

export const vercelBlobProvider: MediaProvider = {
  async upload({ buffer, filename, contentType }) {
    const blob = await put(filename, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });
    return { url: blob.url, size: buffer.byteLength };
  },
};
