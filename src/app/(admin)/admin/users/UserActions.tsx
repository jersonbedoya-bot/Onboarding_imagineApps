"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RoleOption = { id: string; label: string };

type Props = {
  userId: string;
  status: "ACTIVE" | "INACTIVE";
  functionalRoleId: string | null;
  roles: RoleOption[];
  isSelf: boolean;
};

// Estructural, sin estilo definido.
export function UserActions({ userId, status, functionalRoleId, roles, isSelf }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function callAction(path: string, init?: RequestInit) {
    setError(null);
    setIsPending(true);
    const response = await fetch(path, { method: "POST", ...init });
    const body = await response.json();
    setIsPending(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "La acción falló.");
      return;
    }
    router.refresh();
  }

  async function handleToggleStatus() {
    const action = status === "ACTIVE" ? "deactivate" : "reactivate";
    await callAction(`/api/users/${userId}/${action}`);
  }

  async function handleRoleChange(newRoleId: string) {
    setError(null);
    setIsPending(true);
    const response = await fetch(`/api/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ functionalRoleId: newRoleId }),
    });
    const body = await response.json();
    setIsPending(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo cambiar el rol.");
      return;
    }
    router.refresh();
  }

  return (
    <span>
      <select
        value={functionalRoleId ?? ""}
        disabled={isPending}
        onChange={(event) => handleRoleChange(event.target.value)}
      >
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.label}
          </option>
        ))}
      </select>
      <button type="button" disabled={isPending || isSelf} onClick={handleToggleStatus}>
        {status === "ACTIVE" ? "Desactivar" : "Reactivar"}
      </button>
      {error && <span role="alert"> {error}</span>}
    </span>
  );
}
