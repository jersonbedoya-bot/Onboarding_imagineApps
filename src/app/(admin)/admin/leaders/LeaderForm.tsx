"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MediaUploader } from "@/components/MediaUploader";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input, Textarea, Checkbox } from "@/components/Field";

type RoleOption = { id: string; label: string };

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
  // Cambiar esta key remonta <MediaUploader/> desde cero — es la única
  // forma de limpiar su preview/estado interno, que vive fuera de este form.
  const [mediaUploaderKey, setMediaUploaderKey] = useState(0);

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
    setScope("COMMON");
    setRoleIds([]);
    setMediaUploaderKey((key) => key + 1);
    router.refresh();
  }

  return (
    <Card as="form" onSubmit={handleSubmit} className="max-w-lg">
      <h2 className="mb-4 font-display text-lg font-semibold text-ink">Nuevo líder</h2>
      <div className="flex flex-col gap-4">
        <Input id="leader-name" label="Nombre" required value={name} onChange={(event) => setName(event.target.value)} />
        <Input id="leader-title" label="Cargo" required value={title} onChange={(event) => setTitle(event.target.value)} />
        <Textarea
          id="leader-description"
          label="Descripción"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Foto</span>
          <MediaUploader key={mediaUploaderKey} onUploaded={(mediaId) => setPhotoMediaId(mediaId)} />
        </div>
        <Input
          id="leader-video"
          label="Video (opcional, YouTube/Vimeo/Loom)"
          type="url"
          value={videoUrl}
          onChange={(event) => setVideoUrl(event.target.value)}
          placeholder="https://youtube.com/watch?v=..."
        />

        <fieldset className="flex flex-col gap-2 rounded-md border border-line p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Alcance</legend>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="leader-scope"
              checked={scope === "COMMON"}
              onChange={() => setScope("COMMON")}
              className="h-4 w-4 border-line text-brand focus:ring-2 focus:ring-brand/30"
            />
            Todos los roles
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="leader-scope"
              checked={scope === "ROLE"}
              onChange={() => setScope("ROLE")}
              className="h-4 w-4 border-line text-brand focus:ring-2 focus:ring-brand/30"
            />
            Roles específicos
          </label>
          {scope === "ROLE" && (
            <div className="ml-6 flex flex-col gap-1.5 border-l border-line pl-3">
              {roles.map((role) => (
                <Checkbox
                  key={role.id}
                  id={`leader-role-${role.id}`}
                  label={role.label}
                  checked={roleIds.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                />
              ))}
            </div>
          )}
        </fieldset>

        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" isLoading={isSubmitting} className="self-start">
          Crear líder
        </Button>
      </div>
    </Card>
  );
}
