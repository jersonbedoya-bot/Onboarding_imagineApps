"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type RoleOption = { id: string; label: string };

// Estructural, sin estilo definido.
export function ProcessForm({ stageId, roles }: { stageId: string; roles: RoleOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [context, setContext] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [scope, setScope] = useState<"COMMON" | "ROLE">("ROLE");
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

    const response = await fetch("/api/processes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stageId,
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
      setError(result?.error?.message ?? "No se pudo crear el proceso.");
      return;
    }

    setTitle("");
    setObjective("");
    setContext("");
    setExpectedResult("");
    setRoleIds([]);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Nuevo proceso en esta etapa</h3>
      <div>
        <label htmlFor="process-title">Título</label>
        <input id="process-title" required value={title} onChange={(event) => setTitle(event.target.value)} />
      </div>
      <div>
        <label htmlFor="process-objective">Objetivo</label>
        <textarea id="process-objective" value={objective} onChange={(event) => setObjective(event.target.value)} />
      </div>
      <div>
        <label htmlFor="process-context">Contexto</label>
        <textarea id="process-context" value={context} onChange={(event) => setContext(event.target.value)} />
      </div>
      <div>
        <label htmlFor="process-result">Resultado esperado</label>
        <textarea id="process-result" value={expectedResult} onChange={(event) => setExpectedResult(event.target.value)} />
      </div>
      <fieldset>
        <legend>Alcance</legend>
        <label>
          <input type="radio" name="process-scope" checked={scope === "COMMON"} onChange={() => setScope("COMMON")} />
          Común (todos los roles)
        </label>
        <label>
          <input type="radio" name="process-scope" checked={scope === "ROLE"} onChange={() => setScope("ROLE")} />
          Específico por rol
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
        {isSubmitting ? "Creando…" : "Crear proceso"}
      </button>
    </form>
  );
}
