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

export const updateStepSchema = z.object({
  title: baseFields.title.optional(),
  description: baseFields.description.optional(),
  instruction: baseFields.instruction.optional(),
  resources: baseFields.resources.optional(),
  videoUrl: z.string().trim().url({ message: "URL de video inválida." }).nullable().optional(),
  links: baseFields.links.optional(),
  completionCriteria: baseFields.completionCriteria.optional(),
  order: baseFields.order,
});
