"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input, Textarea, Checkbox } from "@/components/Field";

type RoleOption = { id: string; label: string };

export type ProcessFormInitial = {
  title: string;
  objective: string;
  context: string;
  expectedResult: string;
  scope: "COMMON" | "ROLE";
  roleIds: string[];
};

export function ProcessForm({
  stageId,
  roles,
  mode = "create",
  processId,
  initial,
  onSaved,
  variant = "card",
}: {
  stageId: string;
  roles: RoleOption[];
  mode?: "create" | "edit";
  processId?: string;
  initial?: ProcessFormInitial;
  onSaved?: () => void;
  variant?: "card" | "bare";
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [objective, setObjective] = useState(initial?.objective ?? "");
  const [context, setContext] = useState(initial?.context ?? "");
  const [expectedResult, setExpectedResult] = useState(initial?.expectedResult ?? "");
  const [scope, setScope] = useState<"COMMON" | "ROLE">(initial?.scope ?? "ROLE");
  const [roleIds, setRoleIds] = useState<string[]>(initial?.roleIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleRole(roleId: string) {
    setRoleIds((current) => (current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const endpoint = mode === "edit" ? `/api/processes/${processId}` : "/api/processes";
    const response = await fetch(endpoint, {
      method: mode === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(mode === "create" ? { stageId } : {}),
        title,
        objective,
        context,
        expectedResult,
        scope,
        roleIds: scope === "ROLE" ? roleIds : [],
      }),
    });
    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok || !result.success) {
      setError(result?.error?.message ?? "No se pudo guardar el proceso.");
      return;
    }

    if (mode === "edit") {
      onSaved?.();
    } else {
      setTitle("");
      setObjective("");
      setContext("");
      setExpectedResult("");
      setScope("ROLE");
      setRoleIds([]);
    }
    router.refresh();
  }

  const fields = (
    <div className="flex flex-col gap-4">
      <Input id={`process-title-${mode}`} label="Título" required value={title} onChange={(event) => setTitle(event.target.value)} />
      <Textarea
        id={`process-objective-${mode}`}
        label="Objetivo"
        value={objective}
        onChange={(event) => setObjective(event.target.value)}
      />
      <Textarea id={`process-context-${mode}`} label="Contexto" value={context} onChange={(event) => setContext(event.target.value)} />
      <Textarea
        id={`process-result-${mode}`}
        label="Resultado esperado"
        value={expectedResult}
        onChange={(event) => setExpectedResult(event.target.value)}
      />

      <fieldset className="flex flex-col gap-2 rounded-md border border-line p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Alcance</legend>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="radio"
            name={`process-scope-${mode}`}
            checked={scope === "COMMON"}
            onChange={() => setScope("COMMON")}
            className="h-4 w-4 border-line text-brand focus:ring-2 focus:ring-brand/30"
          />
          Común (todos los roles)
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="radio"
            name={`process-scope-${mode}`}
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
                id={`process-role-${mode}-${role.id}`}
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
        {mode === "edit" ? "Guardar cambios" : "Crear proceso"}
      </Button>
    </div>
  );

  if (variant === "bare") {
    return <form onSubmit={handleSubmit}>{fields}</form>;
  }

  return (
    <Card as="form" onSubmit={handleSubmit} className="max-w-lg">
      <h3 className="mb-4 font-display text-lg font-semibold text-ink">Nuevo proceso en esta etapa</h3>
      {fields}
    </Card>
  );
}
