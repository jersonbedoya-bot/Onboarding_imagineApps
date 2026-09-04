"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useResourceActions } from "@/lib/admin/useResourceActions";
import type { VideoProvider } from "@/types/enums";
import { LeaderForm, type LeaderFormInitial } from "./LeaderForm";
import { StatusActionButtons } from "@/components/admin/StatusActionButtons";
import { Icon } from "@/components/Icon";

type RoleOption = { id: string; label: string };

export type LeaderActionItem = {
  id: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  name: string;
  title: string;
  description: string;
  photoMediaId: string | null;
  photoUrl: string | null;
  videoUrl: string | null;
  videoProvider: VideoProvider | null;
  scope: "COMMON" | "ROLE";
  roleIds: string[];
};

export function LeaderActions({
  item,
  roles,
  canManageLifecycle = true,
}: {
  item: LeaderActionItem;
  roles: RoleOption[];
  /** false para EDITOR: puede editar/publicar, no archivar/reactivar/borrar. */
  canManageLifecycle?: boolean;
}) {
  const { isPending, error, run } = useResourceActions("/api/leaders");
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  async function deleteItem() {
    if (await run("delete", item.id)) setIsConfirmingDelete(false);
  }

  const initial: LeaderFormInitial = {
    name: item.name,
    title: item.title,
    description: item.description,
    photoMediaId: item.photoMediaId,
    photoUrl: item.photoUrl,
    videoUrl: item.videoUrl ?? "",
    videoProvider: item.videoProvider,
    scope: item.scope,
    roleIds: item.roleIds,
  };

    return (
    <div className="flex flex-wrap items-center gap-2">
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
        canManageLifecycle={canManageLifecycle}
      />
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}

      <Modal open={isEditing} onClose={() => setIsEditing(false)} title="Editar líder">
        <LeaderForm roles={roles} mode="edit" leaderId={item.id} initial={initial} variant="bare" onSaved={() => setIsEditing(false)} />
      </Modal>

      <ConfirmModal
        open={isConfirmingDelete}
        title="Borrar líder para siempre"
        description={`"${item.name}" se va a borrar para siempre. Esta acción no se puede deshacer.`}
        isLoading={isPending}
        onConfirm={deleteItem}
        onClose={() => setIsConfirmingDelete(false)}
      />
    </div>
  );
}
