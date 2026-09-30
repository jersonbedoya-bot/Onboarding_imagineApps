import { cn } from "@/lib/cn";

// Espejo en cliente de la política de acceptInvitationSchema/resetPasswordSchema
// (src/server/validation). No se importan esos schemas porque arrastran
// `mongodb` al bundle del navegador; si cambia la política allá, hay que
// cambiarla acá. Es solo ayuda visual: el servidor sigue siendo quien valida.
const PASSWORD_REQUIREMENTS = [
  { label: "Al menos 8 caracteres", isMet: (value: string) => value.length >= 8 },
  { label: "Al menos una letra", isMet: (value: string) => /[a-zA-Z]/.test(value) },
  { label: "Al menos un número", isMet: (value: string) => /[0-9]/.test(value) },
];

/**
 * Requisitos de contraseña siempre visibles bajo el campo. Antes solo vivían
 * en el placeholder y desaparecían en cuanto la persona empezaba a escribir.
 */
export function PasswordRequirements({ id, password }: { id: string; password: string }) {
  return (
    <ul id={id} className="-mt-2 flex flex-col gap-1 text-xs">
      {PASSWORD_REQUIREMENTS.map((requirement) => {
        const met = requirement.isMet(password);
        return (
          <li key={requirement.label} className={cn("flex items-center gap-1.5", met ? "text-ink" : "text-ink-soft")}>
            {/* El verde solo en la marca: sobre la card oscura el texto verde no llega a contraste AA. */}
            <span aria-hidden="true" className={cn("inline-block w-3 text-center", met && "font-bold text-success")}>
              {met ? "✓" : "•"}
            </span>
            {requirement.label}
            <span className="sr-only">{met ? " (cumplido)" : " (pendiente)"}</span>
          </li>
        );
      })}
    </ul>
  );
}
