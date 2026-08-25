"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

export function StageActions({ stageId, status }: { stageId: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED" }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function callAction(action: "publish" | "archive") {
    setError(null);
    setIsPending(true);
    const response = await fetch(`/api/stages/${stageId}/${action}`, { method: "POST" });
    const body = await response.json();
    setIsPending(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "La acción falló.");
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
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
