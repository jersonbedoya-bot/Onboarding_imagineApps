"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useResourceActions } from "@/lib/admin/useResourceActions";
import { LeaderForm, type LeaderFormInitial } from "./LeaderForm";

type RoleOption = { id: string; label: string };

export type LeaderActionItem = {
  id: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  name: string;
  title: string;
  description: string;
  photoMediaId: string | null;
  videoUrl: string | null;
  scope: "COMMON" | "ROLE";
  roleIds: string[];
};

export function LeaderActions({ item, roles }: { item: LeaderActionItem; roles: RoleOption[] }) {
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
    videoUrl: item.videoUrl ?? "",
    scope: item.scope,
    roleIds: item.roleIds,
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
