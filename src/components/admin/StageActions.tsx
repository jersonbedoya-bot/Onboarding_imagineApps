"use client";

import { useState } from "react";
import { Button, LinkButton } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { useResourceActions } from "@/lib/admin/useResourceActions";
import { StageForm, type StageFormInitial } from "@/components/admin/StageForm";

export type StageActionItem = {
  id: string;
  title: string;
  order: number;
  dependsOnStageId: string;
  isBlocking: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

type StageOption = { id: string; title: string };

// Sin "Borrar": las etapas/la ruta no tienen borrado permanente por diseño
// (ver CLAUDE.md y BACKLOG.md — archivar la ruta no tiene vuelta atrás).
// `viewHref` es opcional: solo se pasa desde la lista de módulos (ahí hace
// falta un botón para entrar al detalle); en el propio detalle del módulo
// no aplica, ya estás ahí.
export function StageActions({ item, allStages, viewHref }: { item: StageActionItem; allStages: StageOption[]; viewHref?: string }) {
  const { isPending, error, run } = useResourceActions("/api/stages");
  const [isEditing, setIsEditing] = useState(false);

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
          Ver módulo →
        </LinkButton>
      )}
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
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}

      <Modal open={isEditing} onClose={() => setIsEditing(false)} title="Editar módulo">
        <StageForm existingStages={allStages} mode="edit" stageId={item.id} initial={initial} variant="bare" onSaved={() => setIsEditing(false)} />
      </Modal>
    </div>
  );
}
