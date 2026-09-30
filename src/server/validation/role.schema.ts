import { z } from "zod";

const label = z
  .string()
  .trim()
  .min(2, { message: "El nombre del rol debe tener al menos 2 caracteres." })
  .max(60, { message: "El nombre del rol no puede superar los 60 caracteres." });

export const createRoleSchema = z.object({ label });
export const renameRoleSchema = z.object({ label });
