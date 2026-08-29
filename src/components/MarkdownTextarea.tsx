"use client";

import { useState } from "react";
import { FieldShell, type TextareaProps } from "@/components/Field";
import { MarkdownContent } from "@/components/MarkdownContent";
import { cn } from "@/lib/cn";

/**
 * Textarea con toggle "Editar / Vista previa" para campos que se guardan
 * como Markdown (body de contenido, objective/context/expectedResult de
 * procesos, description/instruction de pasos) — el equivalente a
 * Ctrl+Shift+V de VS Code, para ver cómo va a quedar antes de publicar.
 */
export function MarkdownTextarea({ id, label, error, className, value, ...rest }: TextareaProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const text = typeof value === "string" ? value : "";

  return (
    <FieldShell id={id} label={label} error={error}>
      <div className="mb-1.5 flex gap-1">
        <TabButton active={mode === "edit"} onClick={() => setMode("edit")}>
          Editar
        </TabButton>
        <TabButton active={mode === "preview"} onClick={() => setMode("preview")}>
          Vista previa
        </TabButton>
      </div>
      {mode === "edit" ? (
        <textarea
          id={id}
          value={value}
          className={cn(
            "w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand min-h-[88px] resize-y",
            className,
          )}
          {...rest}
        />
      ) : (
        <div className="min-h-[88px] rounded-md border border-line bg-paper px-3 py-2">
          {text.trim() ? <MarkdownContent>{text}</MarkdownContent> : <p className="text-sm text-ink-soft/60">Nada para previsualizar todavía.</p>}
        </div>
      )}
    </FieldShell>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
        active ? "bg-brand-tint text-brand-strong" : "text-ink-soft hover:bg-brand-tint/50",
      )}
    >
      {children}
    </button>
  );
}
