"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CONTENT_ITEM_TYPES, CONTENT_REQUIREMENTS, type ContentItemType, type ContentRequirement } from "@/types/enums";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input, Select, Textarea, Checkbox } from "@/components/Field";
import { MediaUploader } from "@/components/MediaUploader";
import { CONTENT_TYPE_LABELS, CONTENT_REQUIREMENT_LABELS } from "@/lib/content-labels";

type RoleOption = { id: string; label: string };

export type ContentFormInitial = {
  title: string;
  body: string;
  type: ContentItemType;
  mediaId: string | null;
  videoUrl: string;
  scope: "COMMON" | "ROLE";
  roleIds: string[];
  requirement: ContentRequirement | "";
};

export function ContentForm({
  stageId,
  roles,
  mode = "create",
  contentItemId,
  initial,
  onSaved,
  variant = "card",
}: {
  stageId: string;
  roles: RoleOption[];
  mode?: "create" | "edit";
  contentItemId?: string;
  initial?: ContentFormInitial;
  onSaved?: () => void;
  variant?: "card" | "bare";
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [type, setType] = useState<ContentItemType>(initial?.type ?? "TEXT");
  const [mediaId, setMediaId] = useState<string | null>(initial?.mediaId ?? null);
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");
  const [scope, setScope] = useState<"COMMON" | "ROLE">(initial?.scope ?? "COMMON");
  const [roleIds, setRoleIds] = useState<string[]>(initial?.roleIds ?? []);
  const [requirement, setRequirement] = useState<ContentRequirement | "">(initial?.requirement ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const needsMedia = type === "IMAGE" || type === "MIXED";
  const needsVideo = type === "VIDEO" || type === "MIXED";

  function toggleRole(roleId: string) {
    setRoleIds((current) => (current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (needsMedia && !mediaId) {
      setError("Todavía no subiste la imagen (o la subida falló) — subí un archivo antes de guardar.");
      return;
    }
    if (type === "VIDEO" && !videoUrl) {
      setError("Completá la URL del video antes de guardar.");
      return;
    }

    setIsSubmitting(true);

    const endpoint = mode === "edit" ? `/api/content/${contentItemId}` : "/api/content";
    const response = await fetch(endpoint, {
      method: mode === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(mode === "create" ? { stageId } : {}),
        type,
        scope,
        roleIds: scope === "ROLE" ? roleIds : [],
        title,
        body,
        mediaId: mediaId || (mode === "edit" ? null : undefined),
        videoUrl: videoUrl || (mode === "edit" ? null : undefined),
        requirement: requirement || null,
      }),
    });
    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok || !result.success) {
      setError(result?.error?.message ?? "No se pudo guardar el contenido.");
      return;
    }

    if (mode === "edit") {
      onSaved?.();
    } else {
      setTitle("");
      setBody("");
      setMediaId(null);
      setVideoUrl("");
      setRoleIds([]);
    }
    router.refresh();
  }

  const fields = (
    <div className="flex flex-col gap-4">
      <Input id="content-title" label="Título" required value={title} onChange={(event) => setTitle(event.target.value)} />
      <Textarea id="content-body" label="Cuerpo" required value={body} onChange={(event) => setBody(event.target.value)} />
      <Select id="content-type" label="Tipo" value={type} onChange={(event) => setType(event.target.value as ContentItemType)}>
        {CONTENT_ITEM_TYPES.map((option) => (
          <option key={option} value={option}>
            {CONTENT_TYPE_LABELS[option]}
          </option>
        ))}
      </Select>
      {(type === "VIDEO" || type === "IMAGE" || type === "MIXED") && (
        <p className="-mt-2 text-xs text-ink-soft">Elegiste {CONTENT_TYPE_LABELS[type]}: completá el video y/o la imagen abajo.</p>
      )}

      {needsMedia && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Imagen</span>
          <MediaUploader onUploaded={(id) => setMediaId(id)} />
        </div>
      )}
      {needsVideo && (
        <Input
          id="content-video"
          label="Video (YouTube/Vimeo/Loom)"
          type="url"
          required={type === "VIDEO"}
          value={videoUrl}
          onChange={(event) => setVideoUrl(event.target.value)}
          placeholder="https://youtube.com/watch?v=..."
        />
      )}

      <Select
        id="content-requirement"
        label="Requisito"
        value={requirement}
        onChange={(event) => setRequirement(event.target.value as ContentRequirement | "")}
      >
        <option value="">— Ninguno (no aparece como acción para el usuario) —</option>
        {CONTENT_REQUIREMENTS.map((option) => (
          <option key={option} value={option}>
            {CONTENT_REQUIREMENT_LABELS[option]}
          </option>
        ))}
      </Select>
      {requirement === "OBLIGATORY" && (
        <p className="-mt-2 text-xs text-ink-soft">
          El nuevo empleado va a ver un botón &quot;Marcar como leído&quot; en /onboarding para este contenido.
        </p>
      )}

      <fieldset className="flex flex-col gap-2 rounded-md border border-line p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Alcance</legend>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="radio"
            name={`content-scope-${mode}`}
            checked={scope === "COMMON"}
            onChange={() => setScope("COMMON")}
            className="h-4 w-4 border-line text-brand focus:ring-2 focus:ring-brand/30"
          />
          Común (todos los roles)
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="radio"
            name={`content-scope-${mode}`}
            checked={scope === "ROLE"}
            onChange={() => setScope("ROLE")}
            className="h-4 w-4 border-line text-brand focus:ring-2 focus:ring-brand/30"
          />
          Específico por rol
        </label>
        {scope === "ROLE" && (
          <div className="ml-6 flex flex-col gap-1.5 border-l border-line pl-3">
            {roles.map((role) => (
              <Checkbox
                key={role.id}
                id={`content-role-${mode}-${role.id}`}
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
        {mode === "edit" ? "Guardar cambios" : "Crear contenido"}
      </Button>
    </div>
  );

  if (variant === "bare") {
    return <form onSubmit={handleSubmit}>{fields}</form>;
  }

  return (
    <Card as="form" onSubmit={handleSubmit} className="mt-6 max-w-lg">
      <h3 className="mb-4 font-display text-lg font-semibold text-ink">Nuevo contenido en esta etapa</h3>
      {fields}
    </Card>
  );
}
