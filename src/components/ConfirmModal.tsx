"use client";

import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  /** "danger" (default, rojo) para acciones irreversibles; "neutral" para avisos que no destruyen nada (ej. posible pérdida de formato Markdown). */
  tone?: "danger" | "neutral";
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * Segunda confirmación explícita para acciones irreversibles (borrado
 * permanente) — reemplaza el `confirm()` nativo del navegador que usaban
 * ContentActions/ProcessActions/StepActions/LeaderActions: un admin no
 * técnico distingue mejor un modal con el texto de la acción que un popup
 * genérico del navegador, y evita el "click accidental" de doble-confirmar
 * sin leer. También se reutiliza para avisos no destructivos (`tone="neutral"`,
 * ver markdown-guard.ts) — por eso ambos botones llevan `type="button"`
 * explícito: sin eso, si el modal queda anidado dentro de un <form> (como
 * en ese caso), el click implícitamente dispara el submit del form en vez
 * de solo correr el onClick.
 */
export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Sí, borrar para siempre",
  tone = "danger",
  isLoading,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-5 text-sm text-ink-soft">{description}</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" className="px-4 py-2 text-sm" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="primary"
          className={cn("px-4 py-2 text-sm shadow-none hover:translate-y-0 hover:shadow-none", tone === "danger" && "bg-danger")}
          isLoading={isLoading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
