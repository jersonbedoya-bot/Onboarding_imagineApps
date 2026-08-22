"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Estructural, sin estilo definido.
export function MarkAsReadButton({ contentItemId, completed }: { contentItemId: string; completed: boolean | null }) {
  const router = useRouter();
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
    router.refresh();
  }

  if (completed === null) return null; // no es OBLIGATORY, no requiere acuse
  if (completed) return <span>✓ Leído</span>;

  return (
    <span>
      <button type="button" disabled={isPending} onClick={markAsRead}>
        Marcar como leído
      </button>
      {error && <span role="alert"> {error}</span>}
    </span>
  );
}
