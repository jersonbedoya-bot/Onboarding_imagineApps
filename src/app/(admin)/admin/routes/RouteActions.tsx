"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Estructural, sin estilo definido.
export function RouteActions({ status }: { status: "DRAFT" | "PUBLISHED" | "ARCHIVED" }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function callAction(path: string) {
    setError(null);
    setIsPending(true);
    const response = await fetch(path, { method: "POST" });
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
        <button type="button" disabled={isPending} onClick={() => callAction("/api/route/publish")}>
          Publicar ruta
        </button>
      )}
      {status === "PUBLISHED" && (
        <button type="button" disabled={isPending} onClick={() => callAction("/api/route/archive")}>
          Archivar ruta
        </button>
      )}
      {error && <span role="alert"> {error}</span>}
    </span>
  );
}
