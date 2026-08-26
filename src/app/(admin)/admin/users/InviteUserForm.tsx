"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input, Select, Textarea } from "@/components/Field";

type RoleOption = { id: string; label: string };

export function InviteUserForm({ roles }: { roles: RoleOption[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [platformRole, setPlatformRole] = useState<"USER" | "ADMIN">("USER");
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
      body: JSON.stringify({
        email,
        platformRole,
        functionalRoleId: platformRole === "USER" ? functionalRoleId : undefined,
      }),
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
    <Card className="max-w-lg">
      <h2 className="mb-4 font-display text-lg font-semibold text-ink">Invitar usuario</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input id="invite-email" label="Email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />

        <fieldset className="flex flex-col gap-2 rounded-md border border-line p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Tipo de cuenta</legend>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="invite-platform-role"
              checked={platformRole === "USER"}
              onChange={() => setPlatformRole("USER")}
              className="h-4 w-4 border-line text-brand focus:ring-2 focus:ring-brand/30"
            />
            Usuario (hace el recorrido de onboarding)
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="invite-platform-role"
              checked={platformRole === "ADMIN"}
              onChange={() => setPlatformRole("ADMIN")}
              className="h-4 w-4 border-line text-brand focus:ring-2 focus:ring-brand/30"
            />
            Administrador (gestiona el panel, no hace onboarding)
          </label>
        </fieldset>

        {platformRole === "USER" && (
          <Select id="invite-role" label="Rol funcional" value={functionalRoleId} onChange={(event) => setFunctionalRoleId(event.target.value)}>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </Select>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" isLoading={isSubmitting} className="self-start">
          Crear invitación
        </Button>
      </form>

      {result && (
        <div className="mt-5 rounded-md border border-brand-soft bg-brand-tint p-4">
          <p className="mb-2 text-sm font-medium text-ink">Compartí este mensaje con la persona invitada (no se envía por email):</p>
          <Textarea readOnly value={result.message} rows={3} className="bg-card" />
          <Button type="button" variant="secondary" onClick={copyMessage} className="mt-3 px-4 py-1.5 text-xs">
            Copiar mensaje
          </Button>
        </div>
      )}
    </Card>
  );
}
