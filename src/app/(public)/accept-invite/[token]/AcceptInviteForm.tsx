"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

// Estructural, sin estilo definido.
export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch(`/api/invitations/${token}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password }),
    });
    const body = await response.json();

    setIsSubmitting(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo activar la cuenta.");
      return;
    }

    router.push("/login");
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">Nombre</label>
        <input id="name" required value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div>
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Activando…" : "Activar cuenta"}
      </button>
    </form>
  );
}
