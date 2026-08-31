/**
 * Sube un archivo a POST /api/media — único punto que arma el FormData y
 * llama al endpoint. Lo comparten MediaUploader (imagen destacada de un
 * content item) y MarkdownTextarea (imagen insertada inline en el cursor);
 * antes solo vivía duplicado dentro de MediaUploader.
 */
export async function uploadMedia(file: File): Promise<{ id: string; url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/media", { method: "POST", body: formData });
  const body = await response.json();

  if (!response.ok || !body.success) {
    throw new Error(body?.error?.message ?? "No se pudo subir la imagen.");
  }

  return { id: body.data.id, url: body.data.url };
}
