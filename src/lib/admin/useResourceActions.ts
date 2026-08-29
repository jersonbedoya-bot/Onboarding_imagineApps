"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ResourceAction = "publish" | "archive" | "reactivate" | "delete";

/**
 * Centraliza el fetch + estado (isPending/error) + refresh que se repetía
 * casi idéntico en ContentActions/ProcessActions/StepActions/LeaderActions/
 * StageActions: cada uno solo declaraba qué botones mostrar según `status`,
 * pero reimplementaba el mismo POST/DELETE + manejo de error 5 veces (y ya
 * divergían — a ProcessActions se le había olvidado el botón de borrar).
 *
 * `basePath` es el prefijo REST del recurso, ej. "/api/processes". Las
 * acciones de ciclo de vida pegan a `${basePath}/${id}/${action}` (POST);
 * "delete" pega a `${basePath}/${id}` (DELETE) — mismo shape en todos los
 * endpoints existentes, no se agrega superficie nueva.
 */
export function useResourceActions(basePath: string) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: ResourceAction, id: string): Promise<boolean> {
    setError(null);
    setIsPending(true);

    const url = action === "delete" ? `${basePath}/${id}` : `${basePath}/${id}/${action}`;
    const method = action === "delete" ? "DELETE" : "POST";
    const response = await fetch(url, { method });
    const body = await response.json();
    setIsPending(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "La acción falló.");
      return false;
    }

    router.refresh();
    return true;
  }

  return { isPending, error, run };
}
