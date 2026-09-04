"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Select } from "@/components/Field";
import type { PlatformRole } from "@/types/enums";

type RoleOption = { id: string; label: string };

const ROLE_LABELS: Record<PlatformRole, string> = { USER: "Imaginer", EDITOR: "Editor", ADMIN: "Administrador" };
const ALL_PLATFORM_ROLES: PlatformRole[] = ["USER", "EDITOR", "ADMIN"];

/**
 * Cambiar nivel de acceso (USER/EDITOR/ADMIN) — a propósito un botón +
 * modal de confirmación explícito, no un `<select>` silencioso en la fila
 * (el usuario señaló que eso era justo lo ambiguo de antes). El modal deja
 * elegir a qué otro nivel pasa; si el destino es Imaginer, pide también el
 * rol funcional (obligatorio para poder hacer el recorrido de onboarding).
 */
export function ChangePlatformRoleAction({
  userId,
  userName,
  currentRole,
  roles,
}: {
  userId: string;
  userName: string;
  currentRole: PlatformRole;
  roles: RoleOption[];
}) {
  const router = useRouter();
  const otherRoles = ALL_PLATFORM_ROLES.filter((role) => role !== currentRole);
  const [isOpen, setIsOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<PlatformRole>(otherRoles[0]);
  const [functionalRoleId, setFunctionalRoleId] = useState(roles[0]?.id ?? "");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setError(null);
    setTargetRole(otherRoles[0]);
    setFunctionalRoleId(roles[0]?.id ?? "");
    setIsOpen(true);
  }

  async function confirm() {
    setError(null);
    setIsPending(true);
    const response = await fetch(`/api/users/${userId}/platform-role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platformRole: targetRole,
        functionalRoleId: targetRole === "USER" ? functionalRoleId : undefined,
      }),
    });
    const body = await response.json();
    setIsPending(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo cambiar el nivel de acceso.");
      return;
    }
    setIsOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={openModal}>
        Cambiar nivel
      </Button>

      <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Cambiar nivel de acceso">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            <strong className="text-ink">{userName}</strong> es hoy <strong className="text-ink">{ROLE_LABELS[currentRole]}</strong>.
          </p>

          <Select id="target-platform-role" label="Nuevo nivel" value={targetRole} onChange={(event) => setTargetRole(event.target.value as PlatformRole)}>
            {otherRoles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>

          {targetRole === "USER" && (
            <Select
              id="target-functional-role"
              label="Rol funcional"
              value={functionalRoleId}
              onChange={(event) => setFunctionalRoleId(event.target.value)}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </Select>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="px-4 py-2 text-sm" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button isLoading={isPending} className="px-4 py-2 text-sm" onClick={confirm}>
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
