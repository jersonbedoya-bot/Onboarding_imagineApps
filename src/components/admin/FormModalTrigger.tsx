"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";

/**
 * Botón + Modal para el modo "modal" de los *Form (Content/Process/Stage/
 * Step/Leader) — antes el form de creación quedaba siempre visible al pie
 * de la página, desconectado de la tabla de arriba (¿dónde va a quedar lo
 * que cargo?). Con esto, agregar algo es una acción explícita ("+ Agregar
 * X") que abre un modal — mismo lugar donde ya se edita — y al guardar se
 * cierra solo, dejando ver la tabla ya actualizada como confirmación.
 *
 * El estado de abierto/cerrado lo sigue manejando cada *Form (se cierra a
 * sí mismo tras un guardado exitoso) — este componente solo pone el botón
 * y el modal, para no repetir esa cáscara 5 veces.
 */
export function FormModalTrigger({
  triggerLabel,
  modalTitle,
  isOpen,
  onOpenChange,
  children,
  maxWidthClassName,
}: {
  triggerLabel: string;
  modalTitle: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  maxWidthClassName?: string;
}) {
  return (
    <>
      <Button onClick={() => onOpenChange(true)} className="self-start">
        {triggerLabel}
      </Button>
      <Modal open={isOpen} onClose={() => onOpenChange(false)} title={modalTitle} maxWidthClassName={maxWidthClassName}>
        {children}
      </Modal>
    </>
  );
}
