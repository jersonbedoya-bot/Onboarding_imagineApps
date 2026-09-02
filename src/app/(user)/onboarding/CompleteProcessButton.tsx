"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { useToast } from "@/components/Toast";

/**
 * Reemplaza el completado paso a paso dentro de un proceso (ej. "Project
 * Status", "360 Operación", "NPS", "Pulso de Operaciones"): un solo clic
 * marca todos los pasos pendientes de ESE proceso (ver completeProcess en
 * progress.service.ts). No toca otros procesos ni el contenido de lectura
 * del módulo.
 */
export function CompleteProcessButton({ processId }: { processId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete() {
    setError(null);
    setIsPending(true);
    const response = await fetch(`/api/progress/processes/${processId}/complete`, { method: "POST" });
    const body = await response.json();
    setIsPending(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo completar el proceso.");
      return;
    }
    showToast("Proceso completado");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="secondary" onClick={complete} isLoading={isPending} className="px-4 py-1.5 text-xs">
        Marcar proceso como completado
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
