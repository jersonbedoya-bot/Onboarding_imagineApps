"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { useToast } from "@/components/Toast";
import { launchConfetti } from "@/lib/confetti";

export function MarkAsReadButton({
  contentItemId,
  completed,
  celebrate = false,
}: {
  contentItemId: string;
  completed: boolean | null;
  /** Refuerzo positivo puntual (confeti chico) al marcar como leído — hoy solo
   * lo pide Fase 01 (ver OnboardingJourney), no todo el recorrido: el confeti
   * grande queda reservado para el final absoluto (TerminalCelebration). */
  celebrate?: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markAsRead() {
    setError(null);
    setIsPending(true);
    const response = await fetch(`/api/progress/content/${contentItemId}/read`, { method: "POST" });
    const body = await response.json();
    setIsPending(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo registrar la lectura.");
      return;
    }
    if (celebrate) launchConfetti(24);
    showToast("Marcado como leído");
    router.refresh();
  }

  if (completed === null) return null; // no es OBLIGATORY, no requiere acuse

  if (completed) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Leído
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="secondary" onClick={markAsRead} isLoading={isPending} className="px-4 py-1.5 text-xs">
        Marcar como leído
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
