"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/Field";
import { Button } from "@/components/Button";

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input id="name" label="Nombre" required value={name} onChange={(event) => setName(event.target.value)} />
      <Input
        id="password"
        type="password"
        label="Contraseña"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Activando…" : "Activar cuenta"}
      </Button>
    </form>
  );
}
