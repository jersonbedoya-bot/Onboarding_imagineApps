"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ActionMenu, type ActionMenuItem } from "@/components/ActionMenu";

export function RoleActions({
  roleId,
  label,
  status,
  peopleCount,
}: {
  roleId: string;
  label: string;
  status: "ACTIVE" | "INACTIVE";
  /** Cuántos usuarios tienen este rol asignado hoy — se muestra en el aviso de desactivar (ver comentario abajo). */
  peopleCount: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const [isRenaming, setIsRenaming] = useState(false);
  const [newLabel, setNewLabel] = useState(label);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isSubmittingRename, setIsSubmittingRename] = useState(false);

  const [isConfirmingDeactivate, setIsConfirmingDeactivate] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const [isReactivating, setIsReactivating] = useState(false);

  function openRename() {
    setNewLabel(label);
    setRenameError(null);
    setIsRenaming(true);
  }

  async function handleRename() {
    setRenameError(null);
    setIsSubmittingRename(true);
    const response = await fetch(`/api/roles/${roleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel }),
    });
    const body = await response.json();
    setIsSubmittingRename(false);

    if (!response.ok || !body.success) {
      setRenameError(body?.error?.message ?? "No se pudo cambiar el nombre.");
      return;
    }
    setIsRenaming(false);
    router.refresh();
  }

  async function handleDeactivate() {
    setError(null);
    setIsDeactivating(true);
    const response = await fetch(`/api/roles/${roleId}/deactivate`, { method: "POST" });
    const body = await response.json();
    setIsDeactivating(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo desactivar el rol.");
      return;
    }
    setIsConfirmingDeactivate(false);
    router.refresh();
  }

  async function handleReactivate() {
    setError(null);
    setIsReactivating(true);
    const response = await fetch(`/api/roles/${roleId}/reactivate`, { method: "POST" });
    const body = await response.json();
    setIsReactivating(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo reactivar el rol.");
      return;
    }
    router.refresh();
  }

  const menuItems: ActionMenuItem[] =
    status === "ACTIVE"
      ? [
          { label: "Cambiar nombre", onClick: openRename },
          { label: "Desactivar", onClick: () => setIsConfirmingDeactivate(true), danger: true },
        ]
      : [{ label: "Cambiar nombre", onClick: openRename }];

  return (
    <div className="flex items-center gap-2">
      {status === "INACTIVE" && (
        <Button variant="secondary" isLoading={isReactivating} onClick={handleReactivate} className="px-3 py-1.5 text-xs">
          Reactivar
        </Button>
      )}
      <ActionMenu items={menuItems} label={`Más acciones de ${label}`} />
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}

      <Modal open={isRenaming} onClose={() => setIsRenaming(false)} title="Cambiar nombre del rol">
        <div className="flex flex-col gap-4">
          <Input id="role-rename" label="Nombre del rol" required autoFocus value={newLabel} onChange={(event) => setNewLabel(event.target.value)} />
          {renameError && <p className="text-sm text-danger">{renameError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="px-4 py-2 text-sm" onClick={() => setIsRenaming(false)}>
              Cancelar
            </Button>
            <Button isLoading={isSubmittingRename} className="px-4 py-2 text-sm" onClick={handleRename}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={isConfirmingDeactivate}
        title="Desactivar rol funcional"
        description={
          peopleCount > 0
            ? `"${label}" deja de aparecer para invitar nuevos Imaginers o asignar contenido, procesos y líderes específicos. Hoy hay ${peopleCount} ${peopleCount === 1 ? "persona" : "personas"} con este rol — no se les quita ni se les bloquea nada, siguen viendo su recorrido normal. Puedes reactivarlo cuando quieras.`
            : `"${label}" deja de aparecer para invitar nuevos Imaginers o asignar contenido, procesos y líderes específicos. Puedes reactivarlo cuando quieras.`
        }
        confirmLabel="Sí, desactivar"
        isLoading={isDeactivating}
        onConfirm={handleDeactivate}
        onClose={() => setIsConfirmingDeactivate(false)}
      />
    </div>
  );
}
