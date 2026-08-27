"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

export function LeaderActions({ id, name, status }: { id: string; name: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED" }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function callAction(action: "publish" | "archive") {
    setError(null);
    setIsPending(true);
    const response = await fetch(`/api/leaders/${id}/${action}`, { method: "POST" });
    const body = await response.json();
    setIsPending(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "La acción falló.");
      return;
    }
    router.refresh();
  }

  async function deleteItem() {
    if (!confirm(`¿Borrar "${name}" para siempre? Esta acción no se puede deshacer.`)) return;
    setError(null);
    setIsPending(true);
    const response = await fetch(`/api/leaders/${id}`, { method: "DELETE" });
    const body = await response.json();
    setIsPending(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo borrar.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {status === "DRAFT" && (
        <Button variant="secondary" className="px-3 py-1.5 text-xs" isLoading={isPending} onClick={() => callAction("publish")}>
          Publicar
        </Button>
      )}
      {status !== "ARCHIVED" && (
        <Button
          variant="ghost"
          className="px-3 py-1.5 text-xs text-danger hover:bg-danger-soft"
          isLoading={isPending}
          onClick={() => callAction("archive")}
        >
          Archivar
        </Button>
      )}
      {status === "ARCHIVED" && (
        <Button
          variant="ghost"
          className="px-3 py-1.5 text-xs text-danger hover:bg-danger-soft"
          isLoading={isPending}
          onClick={deleteItem}
        >
          Borrar
        </Button>
      )}
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
