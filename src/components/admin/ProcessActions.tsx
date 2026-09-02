"use client";

import { useState } from "react";
import { Button, LinkButton } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useResourceActions } from "@/lib/admin/useResourceActions";
import { ProcessForm, type ProcessFormInitial } from "@/components/admin/ProcessForm";
import { StatusActionButtons } from "./StatusActionButtons";
import { Icon } from "@/components/Icon";

type RoleOption = { id: string; label: string };

export type ProcessActionItem = {
  id: string;
  stageId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  title: string;
  objective: string;
  context: string;
  expectedResult: string;
  resources: string[];
  scope: "COMMON" | "ROLE";
  roleIds: string[];
};

// `showViewSteps` en false desde la propia página de pasos del proceso —
// mostrar "Ver pasos →" ahí sería un link a la página en la que ya estás.
export function ProcessActions({
  item,
  roles,
  showViewSteps = true,
}: {
  item: ProcessActionItem;
  roles: RoleOption[];
  showViewSteps?: boolean;
}) {
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
    resources: item.resources,
    scope: item.scope,
    roleIds: item.roleIds,
  };

    return (
    <div className="flex flex-wrap items-center gap-2">
      {showViewSteps && (
        <LinkButton href={`/admin/processes/${item.id}`} variant="secondary" className="px-3 py-1.5 text-xs">
          Ver pasos
          <Icon name="chevron-right" size="sm" />
        </LinkButton>
      )}
      <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setIsEditing(true)}>
        <Icon name="edit" size="sm" />
        Editar
      </Button>
      <StatusActionButtons
        status={item.status}
        isPending={isPending}
        onPublish={() => run("publish", item.id)}
        onArchive={() => run("archive", item.id)}
        onReactivate={() => run("reactivate", item.id)}
        onDelete={() => setIsConfirmingDelete(true)}
        compact
      />
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
