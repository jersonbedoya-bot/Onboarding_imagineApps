"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Estructural, sin estilo definido.
export function StepActions({ id, status }: { id: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED" }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function callAction(action: "publish" | "archive") {
    setError(null);
    setIsPending(true);
    const response = await fetch(`/api/steps/${id}/${action}`, { method: "POST" });
    const body = await response.json();
    setIsPending(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "La acción falló.");
      return;
    }
    router.refresh();
  }

  return (
    <span>
      {status === "DRAFT" && (
        <button type="button" disabled={isPending} onClick={() => callAction("publish")}>
          Publicar
        </button>
      )}
      {status !== "ARCHIVED" && (
        <button type="button" disabled={isPending} onClick={() => callAction("archive")}>
          Archivar
        </button>
      )}
      {error && <span role="alert"> {error}</span>}
    </span>
  );
}
