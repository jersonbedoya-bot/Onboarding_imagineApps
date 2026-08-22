"use client";

import { useState } from "react";

// Estructural, sin estilo definido. Solo imágenes — el video del sistema
// es URL embebida (YouTube/Vimeo/Loom), nunca pasa por acá.
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
    <div>
      <input type="file" accept="image/*" onChange={handleFileChange} disabled={isUploading} />
      {isUploading && <span> Subiendo…</span>}
      {error && <p role="alert">{error}</p>}
      {uploadedUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={uploadedUrl} alt="" width={80} />
      )}
    </div>
  );
}
