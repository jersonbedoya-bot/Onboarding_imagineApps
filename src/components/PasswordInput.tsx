"use client";

import { useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { FieldShell, FIELD_BASE, fieldBorder } from "@/components/Field";

export type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  error?: string;
};

export function PasswordInput({ id, label, error, className, ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <FieldShell id={id} label={label} error={error}>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className={cn(FIELD_BASE, fieldBorder(!!error), "pr-10", className)}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-soft transition-colors hover:text-ink"
        >
          {visible ? (
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path
                d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.5A10.4 10.4 0 0 1 12 5c5 0 9 4 10.5 7-0.5 1-1.3 2.2-2.4 3.3M6.3 6.9C4 8.4 2.4 10.6 1.5 12c1.5 3 5.5 7 10.5 7 1.3 0 2.5-0.3 3.7-0.7"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path
                d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7-10.5-7-10.5-7z"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={1.6} />
            </svg>
          )}
        </button>
      </div>
    </FieldShell>
  );
}
