"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { PasswordResetLinkGenerator } from "./PasswordResetLinkGenerator";

type RequestItem = { userId: string; name: string; email: string; requestedAt: string };

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

/**
 * Personas que pidieron ayuda desde "¿Olvidaste tu contraseña?" y todavía
 * no tienen enlace. Va arriba de todo en /admin/users (y se cuenta en el
 * Inicio): alguien está sin poder entrar, es lo más urgente de la página.
 */
export function PasswordResetRequests({ requests }: { requests: RequestItem[] }) {
  const router = useRouter();
  const [active, setActive] = useState<RequestItem | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function dismiss(userId: string) {
    setError(null);
    setDismissingId(userId);
    const response = await fetch(`/api/users/${userId}/password-reset-request/dismiss`, { method: "POST" });
    const body = await response.json().catch(() => null);
    setDismissingId(null);
    if (!response.ok || !body?.success) {
      setError(body?.error?.message ?? "No se pudo descartar la solicitud.");
      return;
    }
    router.refresh();
  }

  // El modal va SIEMPRE en la misma posición del árbol, fuera de la sección:
  // generar el enlace refresca la página y saca esa solicitud de `requests`.
  // Si era la última, la sección desaparece — si el modal colgara de ella,
  // React lo remontaría y se perdería el mensaje con el enlace, que se ve
  // una sola vez.
  return (
    <>
      {requests.length > 0 && (
    <section className="mb-10 rounded-lg border border-brand-soft bg-brand-tint p-5">
      <h2 className="mb-1 font-display text-lg font-semibold text-ink">
        {requests.length === 1 ? "1 persona necesita" : `${requests.length} personas necesitan`} una nueva contraseña
      </h2>
      <p className="mb-4 text-sm text-ink-soft">
        La pidieron desde «¿Olvidaste tu contraseña?». Genera un enlace y envíaselo por Google Chat: con él, cada quien elige su
        propia contraseña.
      </p>
      <ul className="flex flex-col gap-2">
        {requests.map((request) => (
          <li key={request.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-card p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{request.name}</p>
              <p className="truncate text-xs text-ink-soft">
                {request.email} · lo pidió el {formatDate(request.requestedAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button className="px-4 py-1.5 text-xs" onClick={() => setActive(request)}>
                Generar enlace
              </Button>
              <Button
                variant="ghost"
                className="px-3 py-1.5 text-xs"
                isLoading={dismissingId === request.userId}
                onClick={() => dismiss(request.userId)}
              >
                Descartar
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
      )}
      <Modal open={active !== null} onClose={() => setActive(null)} title={active ? `Nueva contraseña para ${active.name}` : ""}>
        {active && <PasswordResetLinkGenerator userId={active.userId} userName={active.name} />}
      </Modal>
    </>
  );
}
