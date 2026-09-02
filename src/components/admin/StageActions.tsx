"use client";

import { useState } from "react";
import { Button, LinkButton } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useResourceActions } from "@/lib/admin/useResourceActions";
import { StageForm, type StageFormInitial } from "@/components/admin/StageForm";
import { StatusActionButtons } from "./StatusActionButtons";
import { Icon } from "@/components/Icon";

export type StageActionItem = {
  id: string;
  title: string;
  order: number;
  dependsOnStageId: string;
  isBlocking: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

type StageOption = { id: string; title: string };

// `viewHref` es opcional: solo se pasa desde la lista de módulos (ahí hace
// falta un botón para entrar al detalle); en el propio detalle del módulo
// no aplica, ya estás ahí.
export function StageActions({ item, allStages, viewHref }: { item: StageActionItem; allStages: StageOption[]; viewHref?: string }) {
  const { isPending, error, run } = useResourceActions("/api/stages");
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  async function deleteItem() {
    if (await run("delete", item.id)) setIsConfirmingDelete(false);
  }

  const initial: StageFormInitial = {
    title: item.title,
    order: item.order,
    dependsOnStageId: item.dependsOnStageId,
    isBlocking: item.isBlocking,
  };

    return (
    <div className="flex flex-wrap items-center gap-2">
      {viewHref && (
        <LinkButton href={viewHref} variant="secondary" className="px-3 py-1.5 text-xs">
          Ver módulo
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

      <Modal open={isEditing} onClose={() => setIsEditing(false)} title="Editar módulo">
        <StageForm existingStages={allStages} mode="edit" stageId={item.id} initial={initial} variant="bare" onSaved={() => setIsEditing(false)} />
      </Modal>

      <ConfirmModal
        open={isConfirmingDelete}
        title="Borrar módulo para siempre"
        description={`"${item.title}" se va a borrar para siempre. Esta acción no se puede deshacer.`}
        isLoading={isPending}
        onConfirm={deleteItem}
        onClose={() => setIsConfirmingDelete(false)}
      />
    </div>
  );
}
