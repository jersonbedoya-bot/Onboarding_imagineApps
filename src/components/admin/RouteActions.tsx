"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { ConfirmModal } from "@/components/ConfirmModal";

/**
 * Estado del onboarding completo (la "ruta" singleton del tenant). Se nombra
 * "onboarding" y no "ruta" porque ese término no aparece en ningún otro lado
 * del panel. Archivar lleva confirmación: es el único clic que deja a TODOS
 * los Imaginers sin onboarding de una.
 */
export function RouteActions({ status }: { status: "DRAFT" | "PUBLISHED" | "ARCHIVED" }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);

  async function callAction(path: string) {
    setError(null);
    setIsPending(true);
    const response = await fetch(path, { method: "POST" });
    const body = await response.json();
    setIsPending(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "La acción falló.");
      return;
    }
    setIsConfirmingArchive(false);
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2">
      {status === "DRAFT" && (
        <Button variant="primary" className="px-4 py-1.5 text-xs" isLoading={isPending} onClick={() => callAction("/api/route/publish")}>
          <Icon name="check" size="sm" />
          Publicar onboarding
        </Button>
      )}
      {status === "PUBLISHED" && (
        <Button
          variant="ghost"
          className="px-4 py-1.5 text-xs text-danger hover:bg-danger-soft"
          onClick={() => setIsConfirmingArchive(true)}
        >
          <Icon name="archive" size="sm" />
          Archivar onboarding
        </Button>
      )}
      {status === "ARCHIVED" && (
        <Button
          variant="secondary"
          className="px-4 py-1.5 text-xs"
          isLoading={isPending}
          onClick={() => callAction("/api/route/reactivate")}
        >
          <Icon name="reactivate" size="sm" />
          Reactivar onboarding
        </Button>
      )}
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}

      <ConfirmModal
        open={isConfirmingArchive}
        title="Archivar todo el onboarding"
        description="Si archivas el onboarding, ningún Imaginer podrá verlo. Su progreso no se borra. Para volver a mostrarlo tendrás que reactivarlo y publicarlo de nuevo."
        confirmLabel="Sí, archivar"
        isLoading={isPending}
        onConfirm={() => callAction("/api/route/archive")}
        onClose={() => setIsConfirmingArchive(false)}
      />
    </span>
  );
}
