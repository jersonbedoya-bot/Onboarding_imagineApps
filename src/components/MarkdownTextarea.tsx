"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { FieldShell, type TextareaProps } from "@/components/Field";
import { MarkdownContent } from "@/components/MarkdownContent";
import { uploadMedia } from "@/lib/admin/upload-media";
import { cn } from "@/lib/cn";

/**
 * Textarea con toggle "Editar / Vista previa" para campos que se guardan
 * como Markdown (body de contenido, objective/context/expectedResult de
 * procesos, description/instruction de pasos) — el equivalente a
 * Ctrl+Shift+V de VS Code, para ver cómo va a quedar antes de publicar.
 *
 * "Insertar imagen" sube el archivo y pega `![](url)` justo en la posición
 * del cursor dentro del texto — antes la única forma de agregar una imagen
 * era el campo de "imagen destacada" del content item, que siempre queda
 * al final del cuerpo sin importar de qué párrafo habla, así que no había
 * forma de que la imagen coincida con el texto que explica.
 */
export function MarkdownTextarea({ id, label, error, className, value, onChange, ...rest }: TextareaProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const text = typeof value === "string" ? value : "";

  async function handleInsertImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite volver a elegir el mismo archivo después
    if (!file || !onChange) return;

    setUploadError(null);
    setIsUploading(true);
    try {
      const { url } = await uploadMedia(file);
      const textarea = textareaRef.current;
      const start = textarea?.selectionStart ?? text.length;
      const end = textarea?.selectionEnd ?? text.length;
      const markdown = `![](${url})`;
      // El espacio antes/después evita que quede pegado a texto sin salto
      // de línea previo (ej. justo después de una palabra).
      const before = text.slice(0, start);
      const after = text.slice(end);
      const needsLeadingBreak = before.length > 0 && !before.endsWith("\n");
      const insert = `${needsLeadingBreak ? "\n\n" : ""}${markdown}\n\n`;
      const nextValue = `${before}${insert}${after}`;

      // MarkdownTextarea es controlado (value/onChange vienen del *Form
      // padre) — se fabrica un evento mínimo porque todos los call sites
      // solo leen event.target.value.
      onChange({ target: { value: nextValue } } as ChangeEvent<HTMLTextAreaElement>);

      const cursorPos = before.length + insert.length;
      requestAnimationFrame(() => {
        textarea?.focus();
        textarea?.setSelectionRange(cursorPos, cursorPos);
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <FieldShell id={id} label={label} error={error}>
      <div className="mb-1.5 flex flex-wrap items-center gap-1">
        <TabButton active={mode === "edit"} onClick={() => setMode("edit")}>
          Editar
        </TabButton>
        <TabButton active={mode === "preview"} onClick={() => setMode("preview")}>
          Vista previa
        </TabButton>
        {mode === "edit" && (
          <>
            <span className="mx-1 h-4 w-px bg-line" aria-hidden="true" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="rounded-md px-2.5 py-1 text-xs font-semibold text-ink-soft transition-colors hover:bg-brand-tint/50 disabled:opacity-50"
            >
              {isUploading ? "Subiendo…" : "🖼️ Insertar imagen"}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleInsertImage} className="hidden" />
          </>
        )}
      </div>
      {uploadError && (
        <p role="alert" className="mb-1.5 text-xs text-danger">
          {uploadError}
        </p>
      )}
      {mode === "edit" ? (
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={onChange}
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
      <p className="mt-1 text-xs text-ink-soft/70">Ubicá el cursor donde va la imagen antes de subirla — se inserta ahí, no al final.</p>
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
