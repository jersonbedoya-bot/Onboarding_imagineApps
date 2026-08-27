"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { StepForm, type StepFormInitial } from "./StepForm";

export type StepActionItem = {
  id: string;
  processId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  title: string;
  description: string;
  instruction: string;
  videoUrl: string | null;
  completionCriteria: string;
};

export function StepActions({ item }: { item: StepActionItem }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  async function callAction(action: "publish" | "archive" | "reactivate") {
    setError(null);
    setIsPending(true);
    const response = await fetch(`/api/steps/${item.id}/${action}`, { method: "POST" });
    const body = await response.json();
    setIsPending(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "La acción falló.");
      return;
    }
    router.refresh();
  }

  async function deleteItem() {
    if (!confirm(`¿Borrar "${item.title}" para siempre? Esta acción no se puede deshacer.`)) return;
    setError(null);
    setIsPending(true);
    const response = await fetch(`/api/steps/${item.id}`, { method: "DELETE" });
    const body = await response.json();
    setIsPending(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo borrar.");
      return;
    }
    router.refresh();
  }

  const initial: StepFormInitial = {
    title: item.title,
    description: item.description,
    instruction: item.instruction,
    videoUrl: item.videoUrl ?? "",
    completionCriteria: item.completionCriteria,
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setIsEditing(true)}>
        Editar
      </Button>
      {item.status === "DRAFT" && (
        <Button variant="secondary" className="px-3 py-1.5 text-xs" isLoading={isPending} onClick={() => callAction("publish")}>
          Publicar
        </Button>
      )}
      {item.status !== "ARCHIVED" && (
        <Button
          variant="ghost"
          className="px-3 py-1.5 text-xs text-danger hover:bg-danger-soft"
          isLoading={isPending}
          onClick={() => callAction("archive")}
        >
          Archivar
        </Button>
      )}
      {item.status === "ARCHIVED" && (
        <Button variant="secondary" className="px-3 py-1.5 text-xs" isLoading={isPending} onClick={() => callAction("reactivate")}>
          Reactivar
        </Button>
      )}
      {item.status === "ARCHIVED" && (
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

      <Modal open={isEditing} onClose={() => setIsEditing(false)} title="Editar paso">
        <StepForm processId={item.processId} mode="edit" stepId={item.id} initial={initial} variant="bare" onSaved={() => setIsEditing(false)} />
      </Modal>
    </div>
  );
}
