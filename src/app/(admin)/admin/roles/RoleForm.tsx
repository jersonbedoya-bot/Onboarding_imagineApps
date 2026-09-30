"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Field";
import { FormModalTrigger } from "@/components/admin/FormModalTrigger";

/**
 * Crear un rol funcional (Diseño, Ventas, Contabilidad...) — antes esto solo
 * pasaba corriendo un script desde la terminal (npm run db:seed), con el
 * desarrollador editando código a mano; un tenant nuevo sin roles no podía
 * invitar ningún Imaginer (el form de invitación exige elegir uno). No pide
 * nada más que el nombre: el identificador interno (`key`) se genera solo
 * en el servidor (ver role.service.ts), no es algo que la admin deba pensar.
 */
export function RoleForm() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleOpenChange(open: boolean) {
    setIsModalOpen(open);
    if (!open) {
      setLabel("");
      setError(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    const body = await response.json();
    setIsSubmitting(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo crear el rol.");
      return;
    }

    handleOpenChange(false);
    router.refresh();
  }

  return (
    <FormModalTrigger triggerLabel="+ Crear rol funcional" modalTitle="Nuevo rol funcional" isOpen={isModalOpen} onOpenChange={handleOpenChange}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="role-label"
          label="Nombre del rol"
          required
          autoFocus
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Ej. PDM, UX/UI Designer…"
        />
        <p className="-mt-2 text-xs text-ink-soft">
          Va a aparecer así en &quot;Rol funcional&quot; al invitar a un Imaginer, y al elegir el alcance de contenido, procesos y líderes específicos por rol.
        </p>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" isLoading={isSubmitting} className="self-start">
          Crear rol
        </Button>
      </form>
    </FormModalTrigger>
  );
}
