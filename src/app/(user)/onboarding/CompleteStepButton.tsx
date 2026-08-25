"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { useToast } from "@/components/Toast";

export function CompleteStepButton({ stepId, completed }: { stepId: string; completed: boolean }) {
  const router = useRouter();
  const { showToast } = useToast();
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
    showToast("Paso completado");
    router.refresh();
  }

  if (completed) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Completado
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="secondary" onClick={complete} isLoading={isPending} className="px-4 py-1.5 text-xs">
        Marcar como completado
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
