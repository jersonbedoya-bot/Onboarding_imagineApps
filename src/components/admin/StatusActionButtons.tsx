"use client";

import { Button } from "@/components/Button";
import { IconButton } from "@/components/IconButton";
import { Icon } from "@/components/Icon";

/**
 * Fila estándar de botones de estado (Publicar / Archivar / Reactivar /
 * Borrar), compartida por los 4 Action* del admin.
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
  iconOnly = false,
}: {
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isPending: boolean;
  onPublish: () => void;
  onArchive: () => void;
  onReactivate: () => void;
  onDelete: () => void;
  /** compact=true reduce padding — usado dentro de filas de tabla (DataTable). */
  compact?: boolean;
  /** iconOnly=true usa IconButton (sin texto) — para filas densas como ModuleCard, donde el texto repetido compite con la acción primaria de la card. */
  iconOnly?: boolean;
}) {
  if (iconOnly) {
    return (
      <>
        {status === "DRAFT" && <IconButton name="check" label="Publicar" isLoading={isPending} onClick={onPublish} />}
        {status !== "ARCHIVED" && <IconButton name="archive" label="Archivar" danger isLoading={isPending} onClick={onArchive} />}
        {status === "ARCHIVED" && <IconButton name="reactivate" label="Reactivar" isLoading={isPending} onClick={onReactivate} />}
        {status === "ARCHIVED" && <IconButton name="trash" label="Borrar" danger isLoading={isPending} onClick={onDelete} />}
      </>
    );
  }

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
