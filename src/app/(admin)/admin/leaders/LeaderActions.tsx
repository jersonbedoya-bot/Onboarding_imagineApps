"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useResourceActions } from "@/lib/admin/useResourceActions";

export function LeaderActions({ id, name, status }: { id: string; name: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED" }) {
  const { isPending, error, run } = useResourceActions("/api/leaders");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  async function deleteItem() {
    if (await run("delete", id)) setIsConfirmingDelete(false);
  }

  return (
    <div className="flex items-center gap-2">
      {status === "DRAFT" && (
        <Button variant="secondary" className="px-3 py-1.5 text-xs" isLoading={isPending} onClick={() => run("publish", id)}>
          Publicar
        </Button>
      )}
      {status !== "ARCHIVED" && (
        <Button
          variant="ghost"
          className="px-3 py-1.5 text-xs text-danger hover:bg-danger-soft"
          isLoading={isPending}
          onClick={() => run("archive", id)}
        >
          Archivar
        </Button>
      )}
      {status === "ARCHIVED" && (
        <Button variant="secondary" className="px-3 py-1.5 text-xs" isLoading={isPending} onClick={() => run("reactivate", id)}>
          Reactivar
        </Button>
      )}
      {status === "ARCHIVED" && (
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

      <ConfirmModal
        open={isConfirmingDelete}
        title="Borrar líder para siempre"
        description={`"${name}" se va a borrar para siempre. Esta acción no se puede deshacer.`}
        isLoading={isPending}
        onConfirm={deleteItem}
        onClose={() => setIsConfirmingDelete(false)}
      />
    </div>
  );
}
