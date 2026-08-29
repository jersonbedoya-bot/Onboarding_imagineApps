"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
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
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  async function callAction(action: "publish" | "archive" | "reactivate") {
    setError(null);
    setIsPending(true);
    const response = await fetch(`/api/leaders/${item.id}/${action}`, { method: "POST" });
    const body = await response.json();
    setIsPending(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "La acción falló.");
      return;
    }
    router.refresh();
  }

  async function deleteItem() {
    if (!confirm(`¿Borrar "${item.name}" para siempre? Esta acción no se puede deshacer.`)) return;
    setError(null);
    setIsPending(true);
    const response = await fetch(`/api/leaders/${item.id}`, { method: "DELETE" });
    const body = await response.json();
    setIsPending(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo borrar.");
      return;
    }
    router.refresh();
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
        <Button variant="secondary" className="px-3 py-1.5 text-xs" isLoading={isPending} onClick={() => callAction("reactivate")}>
          Reactivar
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

      <Modal open={isEditing} onClose={() => setIsEditing(false)} title="Editar líder">
        <LeaderForm roles={roles} mode="edit" leaderId={item.id} initial={initial} variant="bare" onSaved={() => setIsEditing(false)} />
      </Modal>
    </div>
  );
}
