"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Select } from "@/components/Field";
import { PasswordInput } from "@/components/PasswordInput";
import { Modal } from "@/components/Modal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ActionMenu, type ActionMenuItem } from "@/components/ActionMenu";
import type { PlatformRole } from "@/types/enums";

type RoleOption = { id: string; label: string };

const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = { USER: "Imaginer", EDITOR: "Editor", ADMIN: "Administrador" };
const ALL_PLATFORM_ROLES: PlatformRole[] = ["USER", "EDITOR", "ADMIN"];

type Props = {
  userId: string;
  userName: string;
  status: "ACTIVE" | "INACTIVE";
  currentPlatformRole: PlatformRole;
  functionalRoleId: string | null;
  roles: RoleOption[];
  isSelf: boolean;
  /** false para Admin/Editor en el roster de equipo administrativo — no tienen rol funcional, no aplica el selector ni "Reiniciar onboarding". */
  showFunctionalRoleSelect?: boolean;
};

/**
 * Todas las acciones sobre un usuario, agrupadas en un solo `ActionMenu`
 * ("⋯") — pedido explícito del usuario: antes cada acción (cambiar nivel de
 * acceso, restablecer contraseña, reiniciar onboarding, desactivar/
 * reactivar, borrar) era un botón suelto con su propio color en la fila, y
 * se veía como un mosaico. Ahora la fila muestra un solo control siempre
 * igual; el color (rojo) queda reservado a las acciones destructivas, y
 * solo se ve una vez abierto el menú. El selector de rol funcional queda
 * FUERA del menú (no es una "acción" con confirmación, es edición en línea
 * directa) — ver showFunctionalRoleSelect.
 *
 * Antes "Cambiar nivel de acceso" era su propio componente (ChangePlatform-
 * RoleAction) al lado de este, con su propio botón — se fusionó acá porque
 * ambos se renderizan siempre juntos, y el menú necesita un solo trigger.
 */
export function UserActions({
  userId,
  userName,
  status,
  currentPlatformRole,
  functionalRoleId,
  roles,
  isSelf,
  showFunctionalRoleSelect = true,
}: Props) {
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

  // Cambiar nivel de acceso (USER/EDITOR/ADMIN) — modal de confirmación
  // explícito, no un <select> silencioso (el usuario señaló en su momento
  // que eso era ambiguo). Si el destino es Imaginer, pide también el rol
  // funcional (obligatorio para poder hacer el recorrido de onboarding).
  const otherPlatformRoles = ALL_PLATFORM_ROLES.filter((role) => role !== currentPlatformRole);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [targetRole, setTargetRole] = useState<PlatformRole>(otherPlatformRoles[0]);
  const [targetFunctionalRoleId, setTargetFunctionalRoleId] = useState(roles[0]?.id ?? "");
  const [isChangingRoleSubmitting, setIsChangingRoleSubmitting] = useState(false);
  const [roleChangeError, setRoleChangeError] = useState<string | null>(null);

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

  function openChangeRole() {
    setRoleChangeError(null);
    setTargetRole(otherPlatformRoles[0]);
    setTargetFunctionalRoleId(roles[0]?.id ?? "");
    setIsChangingRole(true);
  }

  async function handleChangeRole() {
    setRoleChangeError(null);
    setIsChangingRoleSubmitting(true);
    const response = await fetch(`/api/users/${userId}/platform-role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platformRole: targetRole,
        functionalRoleId: targetRole === "USER" ? targetFunctionalRoleId : undefined,
      }),
    });
    const body = await response.json();
    setIsChangingRoleSubmitting(false);

    if (!response.ok || !body.success) {
      setRoleChangeError(body?.error?.message ?? "No se pudo cambiar el nivel de acceso.");
      return;
    }
    setIsChangingRole(false);
    router.refresh();
  }

  const menuItems: ActionMenuItem[] = [
    { label: "Cambiar nivel de acceso", onClick: openChangeRole, disabled: isSelf },
    { label: "Restablecer contraseña", onClick: () => setIsResettingPassword(true) },
    ...(showFunctionalRoleSelect && functionalRoleId
      ? [{ label: "Reiniciar onboarding", onClick: () => setIsConfirmingReset(true) }]
      : []),
    {
      label: status === "ACTIVE" ? "Desactivar" : "Reactivar",
      onClick: handleToggleStatus,
      disabled: isSelf,
      danger: status === "ACTIVE",
    },
    { label: "Borrar", onClick: () => setIsConfirmingDelete(true), disabled: isSelf, danger: true },
  ];

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
      <ActionMenu items={menuItems} label={`Más acciones de ${userName}`} />
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}

      <Modal open={isChangingRole} onClose={() => setIsChangingRole(false)} title="Cambiar nivel de acceso">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            <strong className="text-ink">{userName}</strong> es hoy{" "}
            <strong className="text-ink">{PLATFORM_ROLE_LABELS[currentPlatformRole]}</strong>.
          </p>

          <Select
            id="target-platform-role"
            label="Nuevo nivel"
            value={targetRole}
            onChange={(event) => setTargetRole(event.target.value as PlatformRole)}
          >
            {otherPlatformRoles.map((role) => (
              <option key={role} value={role}>
                {PLATFORM_ROLE_LABELS[role]}
              </option>
            ))}
          </Select>

          {targetRole === "USER" && (
            <Select
              id="target-functional-role"
              label="Rol funcional"
              value={targetFunctionalRoleId}
              onChange={(event) => setTargetFunctionalRoleId(event.target.value)}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </Select>
          )}

          {roleChangeError && <p className="text-sm text-danger">{roleChangeError}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="px-4 py-2 text-sm" onClick={() => setIsChangingRole(false)}>
              Cancelar
            </Button>
            <Button isLoading={isChangingRoleSubmitting} className="px-4 py-2 text-sm" onClick={handleChangeRole}>
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>

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
