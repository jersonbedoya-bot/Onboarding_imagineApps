"use client";

import { useState, type FormEvent } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { Button, LinkButton } from "@/components/Button";
import { AuthShell } from "@/components/AuthShell";
import { PasswordRequirements } from "@/components/PasswordRequirements";

// El AuthShell vive acá (no en page.tsx) porque el título depende del estado
// del formulario: tras guardar, "Elige una nueva contraseña" ya no aplica.
export function ResetPasswordForm({ token, firstName, email }: { token: string; firstName: string; email: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    // Sin envío de correos no hay forma de recuperarse de un error de tipeo:
    // se pide dos veces para no dejar a la persona con una contraseña que no sabe.
    if (password !== confirmation) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }
    setIsSubmitting(true);

    const response = await fetch(`/api/password-reset/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const body = await response.json().catch(() => null);
    setIsSubmitting(false);

    if (!response.ok || !body?.success) {
      setError(body?.error?.message ?? "No se pudo cambiar la contraseña.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <AuthShell title="Tu contraseña ya cambió" description={`Ya puedes iniciar sesión con ${email} y tu nueva contraseña.`}>
        <div className="flex flex-col gap-4">
          <p role="status" className="rounded-md bg-success-soft px-3 py-2 text-sm text-ink">
            ✓ Listo, guardamos tu nueva contraseña.
          </p>
          <LinkButton href="/login" variant="primary" className="w-full">
            Iniciar sesión
          </LinkButton>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Elige una nueva contraseña" description={`Hola, ${firstName}. Vas a cambiar la contraseña de ${email}.`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <PasswordInput
          id="password"
          label="Nueva contraseña"
          required
          autoFocus
          aria-describedby="password-requirements"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <PasswordRequirements id="password-requirements" password={password} />
        <PasswordInput
          id="password-confirmation"
          label="Repite la contraseña"
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
        {error && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </AuthShell>
  );
}
