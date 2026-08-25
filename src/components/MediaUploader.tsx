"use client";

import { useState } from "react";

// Solo imágenes — el video del sistema es URL embebida (YouTube/Vimeo/Loom), nunca pasa por acá.
export function MediaUploader({ onUploaded }: { onUploaded: (mediaId: string, url: string) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/media", { method: "POST", body: formData });
    const body = await response.json();
    setIsUploading(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo subir la imagen.");
      return;
    }

    setUploadedUrl(body.data.url);
    onUploaded(body.data.id, body.data.url);
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
      {uploadedUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={uploadedUrl} alt="" width={44} height={44} className="rounded-md border border-line object-cover" />
      )}
    </div>
  );
}
