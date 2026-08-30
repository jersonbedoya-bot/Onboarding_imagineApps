"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useResourceActions } from "@/lib/admin/useResourceActions";
import { ContentForm, type ContentFormInitial } from "./ContentForm";
import type { ContentItemType, ContentRequirement } from "@/types/enums";

type RoleOption = { id: string; label: string };

export type ContentActionItem = {
  id: string;
  stageId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  title: string;
  body: string;
  type: ContentItemType;
  mediaId: string | null;
  videoUrl: string | null;
  scope: "COMMON" | "ROLE";
  roleIds: string[];
  requirement: ContentRequirement | null;
};

export function ContentActions({ item, roles }: { item: ContentActionItem; roles: RoleOption[] }) {
  const { isPending, error, run } = useResourceActions("/api/content");
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  async function deleteItem() {
    if (await run("delete", item.id)) setIsConfirmingDelete(false);
  }

  const initial: ContentFormInitial = {
    title: item.title,
    body: item.body,
    type: item.type,
    mediaId: item.mediaId,
    videoUrl: item.videoUrl ?? "",
    scope: item.scope,
    roleIds: item.roleIds,
    requirement: item.requirement ?? "",
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
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

      <Modal open={isEditing} onClose={() => setIsEditing(false)} title="Editar contenido">
        <ContentForm
          stageId={item.stageId}
          roles={roles}
          mode="edit"
          contentItemId={item.id}
          initial={initial}
          variant="bare"
          onSaved={() => setIsEditing(false)}
        />
      </Modal>

      <ConfirmModal
        open={isConfirmingDelete}
        title="Borrar contenido para siempre"
        description={`"${item.title}" se va a borrar para siempre. Esta acción no se puede deshacer.`}
        isLoading={isPending}
        onConfirm={deleteItem}
        onClose={() => setIsConfirmingDelete(false)}
      />
    </div>
  );
}
