import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white shadow-md hover:-translate-y-0.5 hover:shadow-lg disabled:hover:translate-y-0",
  secondary: "bg-card text-ink border border-line hover:border-brand hover:text-brand-strong",
  ghost: "bg-transparent text-brand-strong hover:bg-brand-tint",
};

const BASE_CLASSES = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-150";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  isLoading?: boolean;
};

export function Button({ variant = "primary", isLoading = false, disabled, className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(BASE_CLASSES, "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none", VARIANT_CLASSES[variant], className)}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading && (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}

export type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
};

/** Mismo estilo visual que Button, para acciones de navegación (no de submit) — misma fila de acciones, misma jerarquía visual. */
export function LinkButton({ href, variant = "secondary", className, children, ...rest }: LinkButtonProps) {
  return (
    <Link href={href} className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], className)} {...rest}>
      {children}
    </Link>
  );
}
