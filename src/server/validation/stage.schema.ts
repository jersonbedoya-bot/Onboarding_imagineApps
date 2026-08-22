import { z } from "zod";
import { ObjectId } from "mongodb";

const objectIdString = z.string().refine((value) => ObjectId.isValid(value), { message: "Id inválido." });

export const createStageSchema = z.object({
  title: z.string().trim().min(2, { message: "El título debe tener al menos 2 caracteres." }),
  order: z.number().int().positive().optional(),
  dependsOnStageId: objectIdString.optional(),
  isBlocking: z.boolean().default(false),
});

export const updateStageSchema = z.object({
  title: z.string().trim().min(2).optional(),
  order: z.number().int().positive().optional(),
  dependsOnStageId: objectIdString.nullable().optional(),
  isBlocking: z.boolean().optional(),
});
