import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon, iconLabel, type IconName } from "@/components/Icon";
import type { ButtonVariant } from "@/components/Button";

const ICON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:-translate-y-0.5 hover:shadow-md",
  secondary: "bg-card text-ink-soft border border-line hover:border-brand hover:text-brand-strong",
  ghost: "bg-transparent text-ink-soft hover:bg-brand-tint hover:text-brand-strong",
};

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  name: IconName;
  /** Texto del tooltip/aria-label; por defecto usa iconLabel(name). */
  label?: string;
  variant?: ButtonVariant;
  isLoading?: boolean;
  /** Tiñe el ícono de rojo (acciones destructivas: Archivar, Borrar) — mismo criterio que StatusActionButtons con texto. */
  danger?: boolean;
};

/**
 * Botón de solo ícono para filas de acciones densas (ej. ModuleCard) donde
 * texto+ícono repetido (Editar/Publicar/Archivar) compite visualmente con
 * la acción primaria de la fila. Tooltip + aria-label vía iconLabel() —
 * accesible sin texto visible.
 */
export function IconButton({ name, label, variant = "secondary", danger = false, isLoading = false, disabled, className, ...rest }: IconButtonProps) {
  const title = label ?? iconLabel(name);
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        danger ? "text-danger hover:bg-danger-soft" : ICON_VARIANT_CLASSES[variant],
        className,
      )}
      {...rest}
    >
      {isLoading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      ) : (
        <Icon name={name} size="sm" />
      )}
    </button>
  );
}
