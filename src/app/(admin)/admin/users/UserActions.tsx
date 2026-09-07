"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Select } from "@/components/Field";
import { PasswordInput } from "@/components/PasswordInput";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
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

  // Restablecer contraseña — no hay envío de correo en esta plataforma, así
  // que si un imaginer la olvida, un admin la fija a mano acá y se la pasa
  // por el canal que use (ver user.service.resetPassword).
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Reiniciar onboarding — borra el progreso guardado, vuelve a arrancar
  // desde la primera etapa. Solo aplica a Imaginers (tienen rol funcional,
  // ver showFunctionalRoleSelect/functionalRoleId).
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isResettingOnboarding, setIsResettingOnboarding] = useState(false);

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

  async function handleResetPassword() {
    setPasswordError(null);
    setIsSubmittingPassword(true);
    const response = await fetch(`/api/users/${userId}/reset-password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    const body = await response.json();
    setIsSubmittingPassword(false);

    if (!response.ok || !body.success) {
      setPasswordError(body?.error?.message ?? "No se pudo restablecer la contraseña.");
      return;
    }
    setIsResettingPassword(false);
    setNewPassword("");
    router.refresh();
  }

  async function handleResetOnboarding() {
    setError(null);
    setIsResettingOnboarding(true);
    const response = await fetch(`/api/users/${userId}/reset-onboarding`, { method: "POST" });
    const body = await response.json();
    setIsResettingOnboarding(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo reiniciar el onboarding.");
      return;
    }
    setIsConfirmingReset(false);
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
      <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setIsResettingPassword(true)}>
        <Icon name="edit" size="sm" />
        Restablecer contraseña
      </Button>
      {showFunctionalRoleSelect && functionalRoleId && (
        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setIsConfirmingReset(true)}>
          <Icon name="reactivate" size="sm" />
          Reiniciar onboarding
        </Button>
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
      <Button
        variant="ghost"
        className="px-3 py-1.5 text-xs text-danger hover:bg-danger-soft"
        disabled={isSelf}
        onClick={() => setIsConfirmingDelete(true)}
      >
        <Icon name="trash" size="sm" />
        Borrar
      </Button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}

      <Modal
        open={isResettingPassword}
        onClose={() => {
          setIsResettingPassword(false);
          setNewPassword("");
          setPasswordError(null);
        }}
        title={`Restablecer contraseña de ${userName}`}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-soft">
            No hay envío de correo — comparte esta contraseña con {userName} por el canal que uses (Slack, WhatsApp, en persona).
          </p>
          <PasswordInput
            label="Nueva contraseña"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            error={passwordError ?? undefined}
            placeholder="Mínimo 8 caracteres, con letra y número"
            autoFocus
          />
          <Button onClick={handleResetPassword} isLoading={isSubmittingPassword} className="self-start">
            Guardar nueva contraseña
          </Button>
        </div>
      </Modal>

      <ConfirmModal
        open={isConfirmingReset}
        title="Reiniciar onboarding"
        description={`El progreso guardado de "${userName}" se va a borrar por completo — vuelve a arrancar desde la primera etapa, como si nunca hubiera empezado. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, reiniciar"
        isLoading={isResettingOnboarding}
        onConfirm={handleResetOnboarding}
        onClose={() => setIsConfirmingReset(false)}
      />

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
