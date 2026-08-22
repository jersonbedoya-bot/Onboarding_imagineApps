"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Estructural, sin estilo definido.
export function CompleteStepButton({ stepId, completed }: { stepId: string; completed: boolean }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete() {
    setError(null);
    setIsPending(true);
    const response = await fetch(`/api/progress/steps/${stepId}/complete`, { method: "POST" });
    const body = await response.json();
    setIsPending(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo completar el paso.");
      return;
    }
    router.refresh();
  }

  if (completed) return <span>✓ Completado</span>;

  return (
    <span>
      <button type="button" disabled={isPending} onClick={complete}>
        Marcar como completado
      </button>
      {error && <span role="alert"> {error}</span>}
    </span>
  );
}
