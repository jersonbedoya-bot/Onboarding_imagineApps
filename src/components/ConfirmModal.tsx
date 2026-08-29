"use client";

import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
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
 * sin leer.
 */
export function ConfirmModal({ open, title, description, confirmLabel = "Sí, borrar para siempre", isLoading, onConfirm, onClose }: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-5 text-sm text-ink-soft">{description}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" className="px-4 py-2 text-sm" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          className="bg-danger px-4 py-2 text-sm shadow-none hover:translate-y-0 hover:shadow-none"
          isLoading={isLoading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
