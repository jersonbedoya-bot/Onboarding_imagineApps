"use client";

import { useState } from "react";
import { uploadMedia } from "@/lib/admin/upload-media";

// Solo imágenes — el video del sistema es URL embebida (YouTube/Vimeo/Loom), nunca pasa por acá.
export function MediaUploader({
  onUploaded,
  initialUrl = null,
}: {
  onUploaded: (mediaId: string, url: string) => void;
  /** Imagen ya asignada al abrir el form (ej. editando un líder que ya tiene foto) —
   * sin esto, el campo se veía igual para "sin foto" y "ya tiene foto, no cambió". */
  initialUrl?: string | null;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(initialUrl);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);
    try {
      const { id, url } = await uploadMedia(file);
      setUploadedUrl(url);
      onUploaded(id, url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={isUploading}
        className="text-sm text-ink-soft file:mr-3 file:rounded-md file:border file:border-line file:bg-paper file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink hover:file:border-brand hover:file:text-brand-strong"
      />
      {isUploading && <span className="text-xs text-ink-soft">Subiendo…</span>}
      {error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}
      {uploadedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={uploadedUrl} alt="" width={56} height={56} className="h-14 w-14 flex-shrink-0 rounded-md border border-line object-cover" />
      ) : (
        // Placeholder explícito (no solo "nada acá") — de un vistazo se ve
        // quién todavía no tiene foto sin tener que fijarse si el campo está vacío.
        <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md border border-dashed border-line text-xs text-ink-soft/60">
          Sin foto
        </span>
      )}
    </div>
  );
}
