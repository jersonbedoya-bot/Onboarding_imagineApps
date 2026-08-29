"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useResourceActions } from "@/lib/admin/useResourceActions";
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
  const { isPending, error, run } = useResourceActions("/api/steps");
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  async function deleteItem() {
    if (await run("delete", item.id)) setIsConfirmingDelete(false);
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
        <Button variant="secondary" className="px-3 py-1.5 text-xs" isLoading={isPending} onClick={() => run("publish", item.id)}>
          Publicar
        </Button>
      )}
      {item.status !== "ARCHIVED" && (
        <Button
          variant="ghost"
          className="px-3 py-1.5 text-xs text-danger hover:bg-danger-soft"
          isLoading={isPending}
          onClick={() => run("archive", item.id)}
        >
          Archivar
        </Button>
      )}
      {item.status === "ARCHIVED" && (
        <Button variant="secondary" className="px-3 py-1.5 text-xs" isLoading={isPending} onClick={() => run("reactivate", item.id)}>
          Reactivar
        </Button>
      )}
      {item.status === "ARCHIVED" && (
        <Button
          variant="ghost"
          className="px-3 py-1.5 text-xs text-danger hover:bg-danger-soft"
          isLoading={isPending}
          onClick={() => setIsConfirmingDelete(true)}
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

      <ConfirmModal
        open={isConfirmingDelete}
        title="Borrar paso para siempre"
        description={`"${item.title}" se va a borrar para siempre. Esta acción no se puede deshacer.`}
        isLoading={isPending}
        onConfirm={deleteItem}
        onClose={() => setIsConfirmingDelete(false)}
      />
    </div>
  );
}
