import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const FIELD_BASE =
  "w-full rounded-md border bg-paper px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-brand/30";

export function fieldBorder(hasError?: boolean) {
  return hasError ? "border-danger focus:border-danger" : "border-line focus:border-brand";
}

/** Shell compartido por Input/Select/Textarea/PasswordInput: label + error, mismo layout siempre. */
export function FieldShell({ id, label, error, children }: { id?: string; label?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {label}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string };

export function Input({ id, label, error, className, ...rest }: InputProps) {
  return (
    <FieldShell id={id} label={label} error={error}>
      <input id={id} className={cn(FIELD_BASE, fieldBorder(!!error), className)} {...rest} />
    </FieldShell>
  );
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string };

export function Select({ id, label, error, className, children, ...rest }: SelectProps) {
  return (
    <FieldShell id={id} label={label} error={error}>
      <select id={id} className={cn(FIELD_BASE, fieldBorder(!!error), className)} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string };

export function Textarea({ id, label, error, className, ...rest }: TextareaProps) {
  return (
    <FieldShell id={id} label={label} error={error}>
      <textarea id={id} className={cn(FIELD_BASE, fieldBorder(!!error), "min-h-[88px] resize-y", className)} {...rest} />
    </FieldShell>
  );
}

export type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & { label: string };

export function Checkbox({ label, className, id, ...rest }: CheckboxProps) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
      <input
        id={id}
        type="checkbox"
        className={cn("h-4 w-4 rounded border-line text-brand focus:ring-2 focus:ring-brand/30", className)}
        {...rest}
      />
      {label}
    </label>
  );
}
