"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Select } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { ConfirmModal } from "@/components/ConfirmModal";

type RoleOption = { id: string; label: string };

type Props = {
  userId: string;
  userName: string;
  status: "ACTIVE" | "INACTIVE";
  functionalRoleId: string | null;
  roles: RoleOption[];
  isSelf: boolean;
  /** false para Admin/Editor en el roster de equipo administrativo — no tienen rol funcional, no aplica el selector. */
  showFunctionalRoleSelect?: boolean;
};

export function UserActions({ userId, userName, status, functionalRoleId, roles, isSelf, showFunctionalRoleSelect = true }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function callAction(path: string, init?: RequestInit) {
    setError(null);
    setIsPending(true);
    const response = await fetch(path, { method: "POST", ...init });
    const body = await response.json();
    setIsPending(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "La acción falló.");
      return;
    }
    router.refresh();
  }

  async function handleToggleStatus() {
    const action = status === "ACTIVE" ? "deactivate" : "reactivate";
    await callAction(`/api/users/${userId}/${action}`);
  }

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);
    const response = await fetch(`/api/users/${userId}`, { method: "DELETE" });
    const body = await response.json();
    setIsDeleting(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo borrar el usuario.");
      return;
    }
    setIsConfirmingDelete(false);
    router.refresh();
  }

  async function handleRoleChange(newRoleId: string) {
    setError(null);
    setIsPending(true);
    const response = await fetch(`/api/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ functionalRoleId: newRoleId }),
    });
    const body = await response.json();
    setIsPending(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo cambiar el rol.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {showFunctionalRoleSelect && (
        <Select
          value={functionalRoleId ?? ""}
          disabled={isPending}
          onChange={(event) => handleRoleChange(event.target.value)}
          className="w-auto min-w-[9rem] py-1.5 text-xs"
        >
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.label}
            </option>
          ))}
        </Select>
      )}
      <Button
        variant={status === "ACTIVE" ? "ghost" : "secondary"}
        className={status === "ACTIVE" ? "px-3 py-1.5 text-xs text-danger hover:bg-danger-soft" : "px-3 py-1.5 text-xs"}
        isLoading={isPending}
        disabled={isSelf}
        onClick={handleToggleStatus}
      >
        {status === "ACTIVE" ? (
          <>
            <Icon name="archive" size="sm" />
            Desactivar
          </>
        ) : (
          <>
            <Icon name="reactivate" size="sm" />
            Reactivar
          </>
        )}
      </Button>
      {status === "INACTIVE" && (
        <Button
          variant="ghost"
          className="px-3 py-1.5 text-xs text-danger hover:bg-danger-soft"
          disabled={isSelf}
          onClick={() => setIsConfirmingDelete(true)}
        >
          <Icon name="trash" size="sm" />
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
        title="Borrar usuario para siempre"
        description={`"${userName}" se va a borrar para siempre — deja de poder loguear y desaparece del listado. Esta acción no se puede deshacer (el progreso de onboarding que ya completó y su historial de auditoría no se borran).`}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setIsConfirmingDelete(false)}
      />
    </div>
  );
}
