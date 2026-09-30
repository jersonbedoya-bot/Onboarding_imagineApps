"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Textarea } from "@/components/Field";

/**
 * Genera el enlace de "elige tu nueva contraseña" (ver
 * password-reset.service.createPasswordResetLink) y muestra el mensaje listo
 * para copiar. Mismo criterio que el resultado de InviteUserForm: el enlace
 * no se guarda en ningún lado, así que se avisa que es la única vez que se ve.
 */
export function PasswordResetLinkGenerator({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setError(null);
    setIsLoading(true);
    const response = await fetch(`/api/users/${userId}/password-reset-link`, { method: "POST" });
    const body = await response.json().catch(() => null);
    setIsLoading(false);

    if (!response.ok || !body?.success) {
      setError(body?.error?.message ?? "No se pudo generar el enlace.");
      return;
    }
    setMessage(body.data.message);
    router.refresh();
  }

  async function copy() {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setError("No se pudo copiar automáticamente — selecciona el texto y cópialo a mano.");
    }
  }

  if (message) {
    return (
      <div className="flex flex-col gap-3 rounded-md border border-brand-soft bg-brand-tint p-4">
        <p className="text-sm text-ink">
          Envíale este mensaje a {userName} por Google Chat. El enlace vence en 24 horas y sirve una sola vez.
        </p>
        <p className="text-sm font-semibold text-ink">⚠️ Este mensaje no se vuelve a mostrar — cópialo antes de cerrar.</p>
        <Textarea readOnly value={message} rows={4} className="bg-card" aria-label="Mensaje con el enlace" />
        <Button type="button" variant="secondary" onClick={copy} className="self-start px-4 py-2 text-xs">
          {copied ? "✓ Copiado" : "Copiar mensaje"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={generate} isLoading={isLoading} className="self-start px-4 py-2 text-sm">
        Generar enlace para que la elija
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
