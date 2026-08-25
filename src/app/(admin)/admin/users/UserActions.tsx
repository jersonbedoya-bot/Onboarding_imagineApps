"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Select } from "@/components/Field";

type RoleOption = { id: string; label: string };

type Props = {
  userId: string;
  status: "ACTIVE" | "INACTIVE";
  functionalRoleId: string | null;
  roles: RoleOption[];
  isSelf: boolean;
};

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
    <div className="flex items-center gap-2">
      <Select
        value={functionalRoleId ?? ""}
        disabled={isPending}
        onChange={(event) => handleRoleChange(event.target.value)}
        className="w-auto py-1.5 text-xs"
      >
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.label}
          </option>
        ))}
      </Select>
      <Button
        variant={status === "ACTIVE" ? "ghost" : "secondary"}
        className={status === "ACTIVE" ? "px-3 py-1.5 text-xs text-danger hover:bg-danger-soft" : "px-3 py-1.5 text-xs"}
        isLoading={isPending}
        disabled={isSelf}
        onClick={handleToggleStatus}
      >
        {status === "ACTIVE" ? "Desactivar" : "Reactivar"}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
