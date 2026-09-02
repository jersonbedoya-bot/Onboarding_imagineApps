import { z } from "zod";

export const updateRouteContentSchema = z.object({
  headline: z.string().trim().min(2, { message: "El título debe tener al menos 2 caracteres." }).max(120).nullable().optional(),
  subtitle: z.string().trim().max(240).nullable().optional(),
});
