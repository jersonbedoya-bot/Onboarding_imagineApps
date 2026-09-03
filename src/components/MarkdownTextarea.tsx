"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { FieldShell, type TextareaProps } from "@/components/Field";
import { MarkdownContent } from "@/components/MarkdownContent";
import { uploadMedia } from "@/lib/admin/upload-media";
import { cn } from "@/lib/cn";

// Plantillas de los botones de "Insertar bloque" — ver comentario del
// componente. El texto es el punto de partida, el admin lo edita después;
// lo único que importa es que calcen con lo que MarkdownContent.tsx sabe
// renderizar de forma destacada (checklist, callout, link solo en su
// párrafo, tabla).
const SNIPPETS = {
  checklist: "- [ ] Primer paso\n- [ ] Segundo paso",
  callout: "> **Dato clave:** completa esto antes de tal fecha, usando tal herramienta.",
  link: "[Abrir herramienta](https://)",
  table: "| Columna 1 | Columna 2 |\n| --- | --- |\n| Dato | Dato |",
  // Solo tiene efecto especial (QuizBlock, ver institutional-content.ts)
  // cuando el título del content item es exactamente "Pon a Prueba lo que
  // Aprendiste" — en cualquier otro content item esto se ve como texto
  // Markdown normal (una lista numerada), no se rompe nada.
  quiz: "1. ¿Pregunta divertida?\n- Opción incorrecta\n- **Opción correcta**\n- Opción incorrecta\nDato curioso que se muestra como respuesta, aciertes o no (opcional).",
} as const;

/**
 * Textarea con toggle "Editar / Vista previa" para campos que se guardan
 * como Markdown (body de contenido, objective/context/expectedResult de
 * procesos, description/instruction de pasos) — el equivalente a
 * Ctrl+Shift+V de VS Code, para ver cómo va a quedar antes de publicar.
 *
 * Los botones "Insertar…" pegan una plantilla en la posición del cursor
 * (mismo mecanismo que ya existía para imágenes): así el admin arma
 * contenido accionable (checklist, dato clave destacado, enlace a
 * herramienta real, tabla) sin tener que memorizar sintaxis Markdown —
 * ver MarkdownContent.tsx, que es quien le da el tratamiento visual
 * especial a cada una de estas 4 formas. "Pregunta de quiz" es distinto:
 * SIEMPRE se ve como Markdown normal acá (y en cualquier content item que
 * no sea el especial de quiz) — solo se renderiza como QuizBlock cuando el
 * título del content item calza con el que espera institutional-content.ts.
 * Está acá para que el admin no tenga que memorizar el formato de pregunta
 * (numerada + opciones `-` + `**negrita**` en la correcta) al editar ESE
 * content item puntual.
 */
export function MarkdownTextarea({ id, label, error, className, value, onChange, ...rest }: TextareaProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isInsertMenuOpen, setIsInsertMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const insertMenuRef = useRef<HTMLDivElement>(null);
  const text = typeof value === "string" ? value : "";

  // Antes eran 5 botones sueltos ("🖼️ Insertar imagen", "☑️ Checklist", "🔑
  // Dato clave", "🔗 Enlace", "📊 Tabla", "🎉 Pregunta de quiz") en la misma
  // fila que Editar/Vista previa — en un modal angosto eso se envolvía en 2-3
  // líneas y era la principal fuente del "muro de botones". Se juntan en un
  // solo menú desplegable.
  useEffect(() => {
    if (!isInsertMenuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (insertMenuRef.current && !insertMenuRef.current.contains(event.target as Node)) {
        setIsInsertMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsInsertMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isInsertMenuOpen]);

  function insertSnippet(snippet: string) {
    if (!onChange) return;
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? text.length;
    const end = textarea?.selectionEnd ?? text.length;
    // El espacio antes/después evita que quede pegado a texto sin salto
    // de línea previo (ej. justo después de una palabra).
    const before = text.slice(0, start);
    const after = text.slice(end);
    const needsLeadingBreak = before.length > 0 && !before.endsWith("\n");
    const insert = `${needsLeadingBreak ? "\n\n" : ""}${snippet}\n\n`;
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
  }

  async function handleInsertImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite volver a elegir el mismo archivo después
    if (!file || !onChange) return;

    setUploadError(null);
    setIsUploading(true);
    try {
      const { url } = await uploadMedia(file);
      insertSnippet(`![](${url})`);
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
            <div className="relative" ref={insertMenuRef}>
              <button
                type="button"
                onClick={() => setIsInsertMenuOpen((open) => !open)}
                disabled={isUploading}
                className="rounded-md px-2.5 py-1 text-xs font-semibold text-ink-soft transition-colors hover:bg-brand-tint/50 disabled:opacity-50"
              >
                {isUploading ? "Subiendo…" : "+ Insertar bloque ▾"}
              </button>
              {isInsertMenuOpen && (
                <div className="absolute left-0 top-full z-10 mt-1 flex w-56 flex-col gap-0.5 rounded-md border border-line bg-card p-1 shadow-lg">
                  <MenuItem
                    onClick={() => {
                      setIsInsertMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                  >
                    🖼️ Imagen
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setIsInsertMenuOpen(false);
                      insertSnippet(SNIPPETS.checklist);
                    }}
                  >
                    ☑️ Checklist
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setIsInsertMenuOpen(false);
                      insertSnippet(SNIPPETS.callout);
                    }}
                  >
                    🔑 Dato clave
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setIsInsertMenuOpen(false);
                      insertSnippet(SNIPPETS.link);
                    }}
                  >
                    🔗 Enlace a herramienta
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setIsInsertMenuOpen(false);
                      insertSnippet(SNIPPETS.table);
                    }}
                  >
                    📊 Tabla
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setIsInsertMenuOpen(false);
                      insertSnippet(SNIPPETS.quiz);
                    }}
                  >
                    🎉 Pregunta de quiz
                  </MenuItem>
                </div>
              )}
            </div>
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
      <p className="mt-1 text-xs text-ink-soft/70">Ubica el cursor antes de insertar un bloque — se agrega ahí, no al final.</p>
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

function MenuItem({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded px-2.5 py-1.5 text-left text-xs font-medium text-ink transition-colors hover:bg-brand-tint/50"
    >
      {children}
    </button>
  );
}
