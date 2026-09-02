"use client";

import { useState } from "react";
import { Button, LinkButton } from "@/components/Button";
import { IconButton } from "@/components/IconButton";
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
//
// `variant="card"` es el modo usado por ModuleCard en la lista: "Ver módulo"
// pasa a ser la acción PRIMARIA (Button variant="primary") y Editar/ciclo de
// vida se agrupan como IconButton — evita que las 3 acciones "compitan"
// visualmente como en la fila de texto plano original. `variant="detail"`
// (default) mantiene el layout de texto+icono, usado en el header del
// detalle del módulo, donde no hay densidad de filas que resolver.
export function StageActions({
  item,
  allStages,
  viewHref,
  variant = "detail",
}: {
  item: StageActionItem;
  allStages: StageOption[];
  viewHref?: string;
  variant?: "detail" | "card";
}) {
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

  const modals = (
    <>
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
    </>
  );

  if (variant === "card") {
    return (
      <div className="flex items-center justify-between gap-2">
        {viewHref && (
          <LinkButton href={viewHref} variant="primary" className="px-4 py-2 text-xs">
            Ver módulo
            <Icon name="chevron-right" size="sm" />
          </LinkButton>
        )}
        <div className="flex items-center gap-1">
          <IconButton name="edit" onClick={() => setIsEditing(true)} />
          <StatusActionButtons
            status={item.status}
            isPending={isPending}
            onPublish={() => run("publish", item.id)}
            onArchive={() => run("archive", item.id)}
            onReactivate={() => run("reactivate", item.id)}
            onDelete={() => setIsConfirmingDelete(true)}
            iconOnly
          />
        </div>
        {error && (
          <span role="alert" className="text-xs text-danger">
            {error}
          </span>
        )}
        {modals}
      </div>
    );
  }

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
      {modals}
    </div>
  );
}
