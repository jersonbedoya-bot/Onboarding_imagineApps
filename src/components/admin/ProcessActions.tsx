"use client";

import { useState } from "react";
import { Button, LinkButton } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useResourceActions } from "@/lib/admin/useResourceActions";
import { ProcessForm, type ProcessFormInitial } from "@/components/admin/ProcessForm";

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
  const { isPending, error, run } = useResourceActions("/api/processes");
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  async function deleteItem() {
    if (await run("delete", item.id)) setIsConfirmingDelete(false);
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
      <LinkButton href={`/admin/processes/${item.id}`} variant="secondary" className="px-3 py-1.5 text-xs">
        Ver pasos →
      </LinkButton>
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

      <ConfirmModal
        open={isConfirmingDelete}
        title="Borrar proceso para siempre"
        description={`"${item.title}" se va a borrar para siempre. Esta acción no se puede deshacer. Si todavía tiene pasos, primero hay que borrarlos a todos.`}
        isLoading={isPending}
        onConfirm={deleteItem}
        onClose={() => setIsConfirmingDelete(false)}
      />
    </div>
  );
}
