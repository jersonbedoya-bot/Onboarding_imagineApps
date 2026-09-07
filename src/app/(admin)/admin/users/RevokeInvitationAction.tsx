"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Icon } from "@/components/Icon";

/**
 * Revoca una invitación PENDING antes de que expire sola (7 días) — antes
 * la única forma de "liberar" un email con invitación pendiente para poder
 * invitarlo de nuevo era esperar. Al revocar, invitation.service.
 * createInvitation ya no ve ese email como bloqueado (solo bloquea por una
 * PENDING no vencida) — "+ Invitar usuario" de arriba ya sirve para mandar
 * una invitación nueva a ese mismo email, sin necesidad de un flujo de
 * "reenviar" aparte.
 */
export function RevokeInvitationAction({ id, email }: { id: string; email: string }) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setIsPending(true);
    const response = await fetch(`/api/invitations/${id}/revoke`, { method: "POST" });
    const body = await response.json();
    setIsPending(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo revocar la invitación.");
      return;
    }
    setIsConfirming(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        className="px-3 py-1.5 text-xs text-danger hover:bg-danger-soft"
        onClick={() => setIsConfirming(true)}
      >
        <Icon name="close" size="sm" />
        Revocar
      </Button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
      <ConfirmModal
        open={isConfirming}
        title="Revocar invitación"
        description={`La invitación a "${email}" deja de servir — el link ya enviado no va a funcionar más. Después de esto podés invitar de nuevo a este mismo email desde "+ Invitar usuario".`}
        confirmLabel="Sí, revocar"
        isLoading={isPending}
        onConfirm={handleConfirm}
        onClose={() => setIsConfirming(false)}
      />
    </div>
  );
}
