"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CONTENT_ITEM_TYPES, CONTENT_REQUIREMENTS, type ContentItemType, type ContentRequirement } from "@/types/enums";

type RoleOption = { id: string; label: string };

// Estructural, sin estilo definido.
export function ContentForm({ stageId, roles }: { stageId: string; roles: RoleOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<ContentItemType>("TEXT");
  const [scope, setScope] = useState<"COMMON" | "ROLE">("COMMON");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [requirement, setRequirement] = useState<ContentRequirement | "">("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleRole(roleId: string) {
    setRoleIds((current) => (current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stageId,
        type,
        scope,
        roleIds: scope === "ROLE" ? roleIds : [],
        title,
        body,
        requirement: requirement || null,
      }),
    });
    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok || !result.success) {
      setError(result?.error?.message ?? "No se pudo crear el contenido.");
      return;
    }

    setTitle("");
    setBody("");
    setRoleIds([]);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Nuevo contenido en esta etapa</h3>
      <div>
        <label htmlFor="content-title">Título</label>
        <input id="content-title" required value={title} onChange={(event) => setTitle(event.target.value)} />
      </div>
      <div>
        <label htmlFor="content-body">Cuerpo</label>
        <textarea id="content-body" required value={body} onChange={(event) => setBody(event.target.value)} />
      </div>
      <div>
        <label htmlFor="content-type">Tipo</label>
        <select id="content-type" value={type} onChange={(event) => setType(event.target.value as ContentItemType)}>
          {CONTENT_ITEM_TYPES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="content-requirement">Requisito (opcional, para &quot;No negociables&quot;)</label>
        <select
          id="content-requirement"
          value={requirement}
          onChange={(event) => setRequirement(event.target.value as ContentRequirement | "")}
        >
          <option value="">— Ninguno —</option>
          {CONTENT_REQUIREMENTS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend>Alcance</legend>
        <label>
          <input
            type="radio"
            name="scope"
            checked={scope === "COMMON"}
            onChange={() => setScope("COMMON")}
          />
          Común (todos los roles)
        </label>
        <label>
          <input type="radio" name="scope" checked={scope === "ROLE"} onChange={() => setScope("ROLE")} />
          Específico por rol
        </label>
        {scope === "ROLE" && (
          <div>
            {roles.map((role) => (
              <label key={role.id}>
                <input
                  type="checkbox"
                  checked={roleIds.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                />
                {role.label}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creando…" : "Crear contenido"}
      </button>
    </form>
  );
}
