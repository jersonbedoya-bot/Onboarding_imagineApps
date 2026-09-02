"use client";

import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";

/**
 * Fila estándar de botones de estado (Publicar / Archivar / Reactivar /
 * Borrar) con ICONOS, compartida por los 4 Action* del admin.
 *
 * Antes estos 4 archivos (Content/Process/Stage/StepActions) duplicaban el
 * mismo bloque de botones en texto plano. Este componente centraliza el
 * patrón de ciclo de vida (DRAFT→PUBLISHED→ARCHIVED) con iconografía
 * consistente y carga única de estado.
 *
 * El botón "Editar" en texto+icono se mantiene en cada Action* porque va
 * ligado a su formulario; aquí solo van las acciones de ciclo de vida.
 */
export function StatusActionButtons({
  status,
  isPending,
  onPublish,
  onArchive,
  onReactivate,
  onDelete,
  compact = false,
}: {
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isPending: boolean;
  onPublish: () => void;
  onArchive: () => void;
  onReactivate: () => void;
  onDelete: () => void;
  /** compact=true reduce padding — usado dentro de filas de tabla (DataTable). */
  compact?: boolean;
}) {
  const btnClass = compact ? "px-3 py-1.5 text-xs" : "";
  return (
    <>
      {status === "DRAFT" && (
        <Button variant="secondary" className={btnClass} isLoading={isPending} onClick={onPublish}>
          <Icon name="check" size="sm" />
          Publicar
        </Button>
      )}
      {status !== "ARCHIVED" && (
        <Button
          variant="ghost"
          className={`text-danger hover:bg-danger-soft ${btnClass}`}
          isLoading={isPending}
          onClick={onArchive}
        >
          <Icon name="archive" size="sm" />
          Archivar
        </Button>
      )}
      {status === "ARCHIVED" && (
        <Button variant="secondary" className={btnClass} isLoading={isPending} onClick={onReactivate}>
          <Icon name="reactivate" size="sm" />
          Reactivar
        </Button>
      )}
      {status === "ARCHIVED" && (
        <Button variant="ghost" className={`text-danger hover:bg-danger-soft ${btnClass}`} isLoading={isPending} onClick={onDelete}>
          <Icon name="trash" size="sm" />
          Borrar
        </Button>
      )}
    </>
  );
}
