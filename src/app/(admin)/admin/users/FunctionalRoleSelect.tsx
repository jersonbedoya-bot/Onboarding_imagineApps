"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/Field";

type RoleOption = { id: string; label: string };

/**
 * Antes esta misma información (rol funcional) aparecía dos veces en la fila
 * del Imaginer: una columna de solo lectura con el nombre del rol, y un
 * `<select>` para cambiarlo escondido dentro de la columna "Acciones" — no
 * quedaba claro cuál de los dos era el real, ni que el segundo era editable.
 * Ahora hay un solo control, en su propia columna "Rol funcional".
 */
export function FunctionalRoleSelect({
  userId,
  functionalRoleId,
  currentRoleLabel,
  roles,
}: {
  userId: string;
  functionalRoleId: string;
  /** Nombre del rol que tiene hoy — puede ser "Ventas (inactivo)", que no está entre `roles` (solo activos). */
  currentRoleLabel: string;
  roles: RoleOption[];
}) {
  // Si el rol actual fue desactivado, no está en `roles`: sin esta opción
  // extra, el <select> mostraba el primer rol de la lista como si fuera el
  // suyo, y un cambio accidental se lo quitaba.
  const currentIsListed = roles.some((role) => role.id === functionalRoleId);
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(newRoleId: string) {
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
    <div className="flex flex-col gap-1">
      <Select
        aria-label="Rol funcional — clic para cambiar"
        value={functionalRoleId}
        disabled={isPending}
        onChange={(event) => handleChange(event.target.value)}
        className="w-auto min-w-[9rem] py-1.5 text-xs"
      >
        {!currentIsListed && (
          <option value={functionalRoleId} disabled>
            {currentRoleLabel}
          </option>
        )}
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.label}
          </option>
        ))}
      </Select>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
