import { z } from "zod";
import { BLOCKED_NEXT_MESSAGE_MAX, PENDING_CONTENT_MESSAGE_MAX } from "@/lib/guide-message-defaults";

// El largo mínimo de cada mensaje se exige solo si ese mensaje queda
// visible: antes era un min(2) fijo, así que desactivar un mensaje y
// vaciarle el texto fallaba con un error genérico, con el textarea ya
// deshabilitado y sin forma de corregirlo salvo volver a activarlo.
export const updateRouteContentSchema = z
  .object({
    headline: z.string().trim().min(2, { message: "El título de bienvenida debe tener al menos 2 caracteres." }).max(120).nullable().optional(),
    subtitle: z.string().trim().max(240).nullable().optional(),
    blockedNextMessage: z.string().trim().max(BLOCKED_NEXT_MESSAGE_MAX).nullable().optional(),
    blockedNextMessageEnabled: z.boolean().optional(),
    pendingContentMessage: z.string().trim().max(PENDING_CONTENT_MESSAGE_MAX).nullable().optional(),
    pendingContentMessageEnabled: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.blockedNextMessageEnabled !== false && data.blockedNextMessage != null && data.blockedNextMessage.length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["blockedNextMessage"],
        message: "El aviso para avanzar necesita un texto (mínimo 2 caracteres) para poder mostrarse — escríbelo o desactívalo.",
      });
    }
    if (data.pendingContentMessageEnabled !== false && data.pendingContentMessage != null && data.pendingContentMessage.length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["pendingContentMessage"],
        message: "El aviso de contenido en revisión necesita un texto (mínimo 2 caracteres) para poder mostrarse — escríbelo o desactívalo.",
      });
    }
  });
