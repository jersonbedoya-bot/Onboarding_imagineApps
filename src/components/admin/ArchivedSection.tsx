"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";

/**
 * Envoltorio colapsable para la lista de items ARCHIVED de un recurso
 * (contenido, procesos, pasos, líderes, etapas) — la "papelera": separada
 * de la tabla de activos (DRAFT+PUBLISHED) para que un módulo con historial
 * no se vea "sucio" de entradas archivadas mezcladas con las vigentes.
 * El filtrado activos/archivados lo hace el page.tsx con datos que ya trae
 * (sin fetch nuevo); este componente solo decide si se muestran o no.
 */
export function ArchivedSection({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  if (count === 0) return null;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
            >
        <Icon
          name="chevron-right"
          size="sm"
          className={`transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden="true"
        />
        Ver archivados · {count}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
