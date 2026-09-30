"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/Field";
import { Button, LinkButton } from "@/components/Button";

/**
 * La plataforma no envía correos, así que "olvidé mi contraseña" no manda
 * nada: deja la solicitud a la vista de los administradores (ver
 * password-reset.service), que le comparten a la persona un enlace para
 * elegir una contraseña nueva. La pantalla lo dice tal cual, para que nadie
 * se quede esperando un correo que nunca llega.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await response.json().catch(() => null);
    setIsSubmitting(false);

    if (!response.ok || !body?.success) {
      setError(body?.error?.message ?? "No se pudo enviar la solicitud. Intenta de nuevo.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell title="Solicitud enviada" description="Ya le avisamos al equipo administrador.">
        <div className="flex flex-col gap-4 text-sm text-ink-soft">
          <p>
            Si <strong className="text-ink">{email}</strong> tiene una cuenta activa, un administrador va a ver tu solicitud y
            te va a compartir por Google Chat un enlace para que elijas una contraseña nueva.
          </p>
          <p>El enlace vence en 24 horas y sirve una sola vez. Si lo necesitas antes, escríbele directamente a Operaciones.</p>
          <LinkButton href="/login" variant="secondary" className="mt-2 w-full">
            Volver a iniciar sesión
          </LinkButton>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="¿Olvidaste tu contraseña?"
      description="Escribe el email con el que ingresas. Un administrador te va a compartir un enlace para que elijas una nueva."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input id="email" name="email" type="email" label="Email" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} />
        {error && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? "Enviando…" : "Pedir ayuda"}
        </Button>
        <Link href="/login" className="text-center text-sm text-ink-soft hover:text-brand-strong">
          Volver a iniciar sesión
        </Link>
      </form>
    </AuthShell>
  );
}
