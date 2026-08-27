"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { ProcessForm, type ProcessFormInitial } from "./ProcessForm";

type RoleOption = { id: string; label: string };

export type ProcessActionItem = {
  id: string;
  stageId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  title: string;
  objective: string;
  context: string;
  expectedResult: string;
  scope: "COMMON" | "ROLE";
  roleIds: string[];
};

export function ProcessActions({ item, roles }: { item: ProcessActionItem; roles: RoleOption[] }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  async function callAction(action: "publish" | "archive") {
    setError(null);
    setIsPending(true);
    const response = await fetch(`/api/processes/${item.id}/${action}`, { method: "POST" });
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
    const response = await fetch(`/api/processes/${item.id}`, { method: "DELETE" });
    const body = await response.json();
    setIsPending(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo borrar.");
      return;
    }
    router.refresh();
  }

  const initial: ProcessFormInitial = {
    title: item.title,
    objective: item.objective,
    context: item.context,
    expectedResult: item.expectedResult,
    scope: item.scope,
    roleIds: item.roleIds,
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

      <Modal open={isEditing} onClose={() => setIsEditing(false)} title="Editar proceso">
        <ProcessForm
          stageId={item.stageId}
          roles={roles}
          mode="edit"
          processId={item.id}
          initial={initial}
          variant="bare"
          onSaved={() => setIsEditing(false)}
        />
      </Modal>
    </div>
  );
}
