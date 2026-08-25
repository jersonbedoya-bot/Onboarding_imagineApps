import { z } from "zod";
import { ObjectId } from "mongodb";

const objectIdString = z.string().refine((value) => ObjectId.isValid(value), { message: "Id inválido." });

const baseFields = {
  title: z.string().trim().min(2, { message: "El título debe tener al menos 2 caracteres." }),
  description: z.string().trim().default(""),
  instruction: z.string().trim().default(""),
  resources: z.array(z.string().trim()).default([]),
  videoUrl: z.string().trim().url({ message: "URL de video inválida." }).optional(),
  links: z.array(z.string().trim()).default([]),
  completionCriteria: z.string().trim().default(""),
  order: z.number().int().positive().optional(),
};

export const createStepSchema = z.object({ processId: objectIdString, ...baseFields });

// Los campos de texto/array de abajo NO reusan baseFields.xxx: esos traen
// .default("")/.default([]), que pisaría el valor existente con vacío en
// cualquier PATCH que no los mencione (bug real encontrado en dev).
export const updateStepSchema = z.object({
  title: baseFields.title.optional(),
  description: z.string().trim().optional(),
  instruction: z.string().trim().optional(),
  resources: z.array(z.string().trim()).optional(),
  videoUrl: z.string().trim().url({ message: "URL de video inválida." }).nullable().optional(),
  links: z.array(z.string().trim()).optional(),
  completionCriteria: z.string().trim().optional(),
  order: baseFields.order,
});
