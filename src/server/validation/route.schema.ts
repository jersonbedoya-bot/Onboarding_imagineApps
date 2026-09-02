import { z } from "zod";

export const updateRouteContentSchema = z.object({
  headline: z.string().trim().min(2, { message: "El título debe tener al menos 2 caracteres." }).max(120).nullable().optional(),
  subtitle: z.string().trim().max(240).nullable().optional(),
  blockedNextMessage: z.string().trim().min(2, { message: "El mensaje debe tener al menos 2 caracteres." }).max(200).nullable().optional(),
  blockedNextMessageEnabled: z.boolean().optional(),
  pendingContentMessage: z.string().trim().min(2, { message: "El mensaje debe tener al menos 2 caracteres." }).max(300).nullable().optional(),
  pendingContentMessageEnabled: z.boolean().optional(),
});
