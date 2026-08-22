"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type RoleOption = { id: string; label: string };

// Estructural, sin estilo definido: el lineamiento de diseño visual
// todavía no existe.
export function InviteUserForm({ roles }: { roles: RoleOption[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [functionalRoleId, setFunctionalRoleId] = useState(roles[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ link: string; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setIsSubmitting(true);

    const response = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, functionalRoleId }),
    });
    const body = await response.json();

    setIsSubmitting(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo crear la invitación.");
      return;
    }

    setResult({ link: body.data.link, message: body.data.message });
    setEmail("");
    router.refresh();
  }

  async function copyMessage() {
    if (!result) return;
    await navigator.clipboard.writeText(result.message);
  }

  return (
    <section>
      <h2>Invitar usuario</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="invite-email">Email</label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="invite-role">Rol funcional</label>
          <select
            id="invite-role"
            value={functionalRoleId}
            onChange={(event) => setFunctionalRoleId(event.target.value)}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creando…" : "Crear invitación"}
        </button>
      </form>

      {result && (
        <div>
          <p>Compartí este mensaje con la persona invitada (no se envía por email):</p>
          <textarea readOnly value={result.message} rows={3} />
          <button type="button" onClick={copyMessage}>
            Copiar mensaje
          </button>
        </div>
      )}
    </section>
  );
}
