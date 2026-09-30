"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Input, Select, Textarea } from "@/components/Field";
import { FormModalTrigger } from "@/components/admin/FormModalTrigger";

type RoleOption = { id: string; label: string };

const PLATFORM_ROLE_DESCRIPTIONS: Record<"USER" | "EDITOR" | "ADMIN", string> = {
  USER: "Hace el recorrido de onboarding. Necesita un rol funcional (ej. PDM, UX/UI Designer) — se lo asignas abajo.",
  EDITOR: "Puede crear y editar contenido, procesos y líderes del onboarding, pero no puede borrar/archivar nada ni gestionar usuarios ni roles.",
  ADMIN: "Gestiona todo el panel: usuarios, permisos y contenido. No hace el recorrido de onboarding.",
};

/**
 * Antes vivía como Card siempre visible al pie de la página (única forma de
 * "agregar X" del admin que no seguía el patrón "+ Agregar" -> modal que ya
 * usan Módulos/Contenido/Procesos/Líderes — ver FormModalTrigger). El
 * usuario lo señaló como lo que menos encajaba con el diseño general.
 *
 * El link/mensaje de la invitación se muestra UNA sola vez (el token crudo
 * no se persiste, ver src/lib/token.ts) — antes quedaba en un panel al pie
 * del form, y un re-submit accidental (o perder de vista la página) lo
 * borraba sin aviso, sin forma de recuperarlo (no hay reenviar todavía, ver
 * BACKLOG.md). Ahora el resultado reemplaza el formulario DENTRO del mismo
 * modal, que no se cierra solo, con una advertencia explícita de que es la
 * única oportunidad de copiarlo.
 */
export function InviteUserForm({ roles }: { roles: RoleOption[] }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [platformRole, setPlatformRole] = useState<"USER" | "EDITOR" | "ADMIN">("USER");
  const [functionalRoleId, setFunctionalRoleId] = useState(roles[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ link: string; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  function resetForm() {
    setEmail("");
    setPlatformRole("USER");
    setFunctionalRoleId(roles[0]?.id ?? "");
    setError(null);
    setResult(null);
    setCopied(false);
  }

  function handleOpenChange(open: boolean) {
    setIsModalOpen(open);
    // Al cerrar (con o sin invitación creada) se limpia todo, para que la
    // próxima vez que se abra el modal empiece de cero — nunca reaparece un
    // link viejo de una invitación anterior.
    if (!open) resetForm();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
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
    router.refresh();
  }

  async function copyMessage() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.message);
      setCopied(true);
    } catch {
      // Clipboard puede fallar por permisos del navegador — el textarea
      // sigue ahí, seleccionable a mano, así que no se pierde el mensaje.
      setError("No se pudo copiar automáticamente — selecciona el texto de abajo y cópialo a mano.");
    }
  }

  return (
    <FormModalTrigger
      triggerLabel="+ Invitar usuario"
      modalTitle={result ? "Invitación creada" : "Invitar usuario"}
      isOpen={isModalOpen}
      onOpenChange={handleOpenChange}
      // Mientras se muestra el link/mensaje recién creado, un click afuera
      // (o la "X") ya no lo cierra sin querer — el usuario reportó justo
      // esto: perdía el link para siempre por cerrar el modal sin darse
      // cuenta. Solo "Ya lo copié, cerrar" (abajo) puede cerrarlo ahora.
      dismissible={!result}
    >
      {result ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-brand-soft bg-brand-tint p-4">
            <p className="mb-1 text-sm text-ink">
              La plataforma no envía correos: copia este mensaje y envíaselo tú a la persona. Compártelo por Google Chat o por correo.
            </p>
            <p className="mb-2 text-sm font-semibold text-ink">
              ⚠️ Este mensaje no se vuelve a mostrar — cópialo antes de cerrar esta ventana.
            </p>
            <Textarea readOnly value={result.message} rows={3} className="bg-card" />
            <Button type="button" variant="secondary" onClick={copyMessage} className="mt-3 px-4 py-2 text-xs">
              {copied ? "✓ Copiado" : "Copiar mensaje"}
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="button" onClick={() => handleOpenChange(false)} className="self-start">
            Ya lo copié, cerrar
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input id="invite-email" label="Email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />

          <Select
            id="invite-platform-role"
            label="Nivel de acceso"
            value={platformRole}
            onChange={(event) => setPlatformRole(event.target.value as "USER" | "EDITOR" | "ADMIN")}
          >
            <option value="USER">Imaginer</option>
            <option value="EDITOR">Editor</option>
            <option value="ADMIN">Administrador</option>
          </Select>
          <p className="-mt-2 text-xs text-ink-soft">{PLATFORM_ROLE_DESCRIPTIONS[platformRole]}</p>

          {platformRole === "USER" &&
            (roles.length > 0 ? (
              <Select id="invite-role" label="Rol funcional" value={functionalRoleId} onChange={(event) => setFunctionalRoleId(event.target.value)}>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </Select>
            ) : (
              <p className="text-sm text-danger">
                Todavía no hay ningún rol funcional creado — antes de invitar a un Imaginer, crea uno en{" "}
                <Link href="/admin/roles" className="underline">
                  Personas → Roles
                </Link>
                .
              </p>
            ))}

          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" isLoading={isSubmitting} disabled={platformRole === "USER" && roles.length === 0} className="self-start">
            Crear invitación
          </Button>
        </form>
      )}
    </FormModalTrigger>
  );
}
