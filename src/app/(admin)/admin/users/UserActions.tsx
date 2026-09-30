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
import { PasswordResetLinkGenerator } from "./PasswordResetLinkGenerator";

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
};

/**
 * Todas las acciones sobre un usuario, agrupadas en un solo `ActionMenu`
 * ("⋯") — pedido explícito del usuario: antes cada acción (cambiar nivel de
 * acceso, restablecer contraseña, reiniciar onboarding, desactivar/
 * reactivar, borrar) era un botón suelto con su propio color en la fila, y
 * se veía como un mosaico. Ahora la fila muestra un solo control siempre
 * igual; el color (rojo) queda reservado a las acciones destructivas, y
 * solo se ve una vez abierto el menú. El rol funcional (edición en línea
 * directa, no una "acción" con confirmación) vive en su propia columna, ver
 * FunctionalRoleSelect — antes vivía acá duplicado con la columna de solo
 * lectura "Rol funcional", y no quedaba claro cuál de los dos era editable.
 *
 * Antes "Cambiar nivel de acceso" era su propio componente (ChangePlatform-
 * RoleAction) al lado de este, con su propio botón — se fusionó acá porque
 * ambos se renderizan siempre juntos, y el menú necesita un solo trigger.
 */
export function UserActions({ userId, userName, status, currentPlatformRole, functionalRoleId, roles, isSelf }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Restablecer contraseña — no hay envío de correo: lo recomendado es un
  // enlace de un solo uso para que la persona elija la suya (ver
  // PasswordResetLinkGenerator); fijarla a mano (user.service.resetPassword)
  // queda como alternativa.
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Reiniciar onboarding — borra progreso y respuestas de quiz, vuelve a
  // arrancar desde el primer módulo. Solo aplica a Imaginers (tienen functionalRoleId).
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
    const response = await fetch(path, { method: "POST", ...init });
    const body = await response.json();

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
    ...(functionalRoleId ? [{ label: "Reiniciar onboarding", onClick: () => setIsConfirmingReset(true) }] : []),
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
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-ink">Recomendado: que la elija {userName}</p>
            <p className="text-sm text-ink-soft">
              Genera un enlace de un solo uso y envíaselo por Google Chat. Así nadie más conoce su nueva contraseña.
            </p>
            {status === "ACTIVE" ? (
              <PasswordResetLinkGenerator userId={userId} userName={userName} />
            ) : (
              <p className="text-xs text-ink-soft">Esta cuenta está desactivada: reactívala para poder generarle un enlace.</p>
            )}
          </div>
          <div className="flex flex-col gap-3 border-t border-line pt-5">
            <p className="text-sm font-semibold text-ink">O fíjala tú</p>
            <p className="text-sm text-ink-soft">No hay envío de correo: después tendrás que compartirla con {userName} por Google Chat o en persona.</p>
            <PasswordInput
              label="Nueva contraseña"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              error={passwordError ?? undefined}
              placeholder="Mínimo 8 caracteres, con letra y número"
            />
            <Button variant="secondary" onClick={handleResetPassword} isLoading={isSubmittingPassword} className="self-start">
              Guardar nueva contraseña
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={isConfirmingReset}
        title="Reiniciar onboarding"
        description={`Se borra todo el progreso de "${userName}", incluidas sus respuestas de quiz: vuelve a empezar desde el primer módulo, como si nunca hubiera empezado. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, reiniciar"
        isLoading={isResettingOnboarding}
        onConfirm={handleResetOnboarding}
        onClose={() => setIsConfirmingReset(false)}
      />

      <ConfirmModal
        open={isConfirmingDelete}
        title="Borrar usuario para siempre"
        description={`"${userName}" se va a borrar para siempre — ya no puede iniciar sesión y desaparece del listado. Esta acción no se puede deshacer (el progreso de onboarding que ya completó y su historial de auditoría no se borran).`}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setIsConfirmingDelete(false)}
      />
    </div>
  );
}
