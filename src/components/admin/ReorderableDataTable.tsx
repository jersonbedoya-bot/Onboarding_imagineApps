"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";

export type ReorderableRow = {
  id: string;
  order: number;
  /** Celdas ya renderizadas en el servidor (misma columna que la tabla de
   * archivados) — nunca funciones ni documentos de Mongo crudos, ninguno de
   * los dos es serializable a través del límite Server→Client Component. */
  cells: ReactNode[];
};

/**
 * Variante de DataTable donde cada fila completa se arrastra para
 * reordenarla (drag & drop nativo del navegador — sin librería nueva).
 * Reemplaza el enfoque anterior de flechas subir/bajar por fila: el usuario
 * pidió poder tomar la fila completa y moverla, viendo el orden reflejarse
 * en vivo, no solo cambiar un número.
 *
 * Se usa solo para las listas ACTIVAS de contenido/procesos/pasos — los
 * archivados siguen con el DataTable normal, sin sentido reordenar algo que
 * no se muestra al usuario final.
 *
 * El array solo se reordena UNA VEZ, al soltar (`drop`) — no en cada
 * `dragover`. Reordenar en cada `dragover` mueve el nodo del DOM que el
 * navegador está siguiendo como origen del arrastre, y eso corta la sesión
 * nativa de drag a mitad de camino (falla intermitente, verificado en vivo).
 * Mientras se arrastra, `dragover` solo actualiza qué fila está "debajo"
 * para resaltarla — sin tocar el array.
 *
 * Al soltar, se recalculan los `order` de las filas que cambiaron de
 * posición permutando los mismos valores de `order` que ya existían (sin
 * asumir que sean 1..N contiguos) y se persiste con un PATCH por fila
 * afectada al mismo endpoint que ya usa cada *Form — `order` ya es un campo
 * opcional soportado en los 3 schemas de validación, no hizo falta tocar el
 * backend.
 */
export function ReorderableDataTable({
  headers,
  rows,
  emptyMessage = "Sin resultados.",
  basePath,
}: {
  headers: string[];
  rows: ReorderableRow[];
  emptyMessage?: string;
  basePath: string;
}) {
  const router = useRouter();
  const [localRows, setLocalRows] = useState(rows);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Si llegan filas frescas del servidor (tras guardar, o cualquier otro
  // router.refresh() en la página), se resincroniza el estado local — patrón
  // "ajustar estado durante el render" recomendado por React en vez de un
  // efecto, para no disparar un render en cascada.
  const [prevRows, setPrevRows] = useState(rows);
  if (rows !== prevRows) {
    setPrevRows(rows);
    setLocalRows(rows);
  }

  if (localRows.length === 0) {
    return <EmptyState title={emptyMessage} />;
  }

  async function handleDrop(targetId: string) {
    const sourceId = dragId;
    setDragId(null);
    setOverId(null);
    if (!sourceId || sourceId === targetId) return;

    const from = localRows.findIndex((row) => row.id === sourceId);
    const to = localRows.findIndex((row) => row.id === targetId);
    if (from === -1 || to === -1) return;

    const reordered = localRows.slice();
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setLocalRows(reordered);

    const originalOrders = rows.map((row) => row.order).sort((a, b) => a - b);
    const changes = reordered
      .map((row, index) => ({ id: row.id, order: originalOrders[index] }))
      .filter(({ id, order }) => rows.find((row) => row.id === id)?.order !== order);
    if (changes.length === 0) return;

    setIsSaving(true);
    try {
      const results = await Promise.all(
        changes.map(({ id, order }) =>
          fetch(`${basePath}/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order }),
          }),
        ),
      );
      if (results.every((response) => response.ok)) router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-card shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-paper">
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ink-soft">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {localRows.map((row) => {
            const isDragging = dragId === row.id;
            const isDropTarget = overId === row.id && dragId !== null && dragId !== row.id;
            return (
              <tr
                key={row.id}
                draggable={!isSaving}
                onDragStart={() => setDragId(row.id)}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (overId !== row.id) setOverId(row.id);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  void handleDrop(row.id);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                className={`cursor-grab border-b border-line last:border-0 active:cursor-grabbing ${
                  isDragging ? "opacity-40" : isDropTarget ? "bg-brand-tint/70" : "hover:bg-brand-tint/40"
                }`}
              >
                {row.cells.map((cell, index) => (
                  <td key={index} className="px-4 py-3 text-ink">
                    {index === 0 ? (
                      <span className="flex items-center gap-2">
                        <Icon name="drag-handle" size="sm" className="text-ink-soft" />
                        {cell}
                      </span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
