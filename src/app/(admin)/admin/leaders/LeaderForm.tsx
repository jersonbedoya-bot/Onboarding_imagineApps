"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MediaUploader } from "@/components/MediaUploader";

type RoleOption = { id: string; label: string };

// Estructural, sin estilo definido.
export function LeaderForm({ roles }: { roles: RoleOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoMediaId, setPhotoMediaId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [scope, setScope] = useState<"COMMON" | "ROLE">("COMMON");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleRole(roleId: string) {
    setRoleIds((current) => (current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/leaders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        title,
        description,
        photoMediaId: photoMediaId || undefined,
        videoUrl: videoUrl || undefined,
        scope,
        roleIds: scope === "ROLE" ? roleIds : [],
      }),
    });
    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok || !result.success) {
      setError(result?.error?.message ?? "No se pudo crear el líder.");
      return;
    }

    setName("");
    setTitle("");
    setDescription("");
    setPhotoMediaId(null);
    setVideoUrl("");
    setRoleIds([]);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Nuevo líder</h2>
      <div>
        <label htmlFor="leader-name">Nombre</label>
        <input id="leader-name" required value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div>
        <label htmlFor="leader-title">Cargo</label>
        <input id="leader-title" required value={title} onChange={(event) => setTitle(event.target.value)} />
      </div>
      <div>
        <label htmlFor="leader-description">Descripción</label>
        <textarea id="leader-description" value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>
      <div>
        <label>Foto</label>
        <MediaUploader onUploaded={(mediaId) => setPhotoMediaId(mediaId)} />
      </div>
      <div>
        <label htmlFor="leader-video">Video (opcional, YouTube/Vimeo/Loom)</label>
        <input
          id="leader-video"
          type="url"
          value={videoUrl}
          onChange={(event) => setVideoUrl(event.target.value)}
          placeholder="https://youtube.com/watch?v=..."
        />
      </div>
      <fieldset>
        <legend>Alcance</legend>
        <label>
          <input type="radio" name="leader-scope" checked={scope === "COMMON"} onChange={() => setScope("COMMON")} />
          Todos los roles
        </label>
        <label>
          <input type="radio" name="leader-scope" checked={scope === "ROLE"} onChange={() => setScope("ROLE")} />
          Roles específicos
        </label>
        {scope === "ROLE" && (
          <div>
            {roles.map((role) => (
              <label key={role.id}>
                <input type="checkbox" checked={roleIds.includes(role.id)} onChange={() => toggleRole(role.id)} />
                {role.label}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creando…" : "Crear líder"}
      </button>
    </form>
  );
}
