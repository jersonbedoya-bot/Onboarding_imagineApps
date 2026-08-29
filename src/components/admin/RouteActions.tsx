"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

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
    <span className="inline-flex items-center gap-2">
      {status === "DRAFT" && (
        <Button variant="primary" className="px-4 py-1.5 text-xs" isLoading={isPending} onClick={() => callAction("/api/route/publish")}>
          Publicar ruta
        </Button>
      )}
      {status === "PUBLISHED" && (
        <Button
          variant="ghost"
          className="px-4 py-1.5 text-xs text-danger hover:bg-danger-soft"
          isLoading={isPending}
          onClick={() => callAction("/api/route/archive")}
        >
          Archivar ruta
        </Button>
      )}
      {status === "ARCHIVED" && (
        <Button
          variant="secondary"
          className="px-4 py-1.5 text-xs"
          isLoading={isPending}
          onClick={() => callAction("/api/route/reactivate")}
        >
          Reactivar ruta
        </Button>
      )}
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
