import { z } from "zod";
import { ObjectId } from "mongodb";
import { CONTENT_ITEM_TYPES, CONTENT_REQUIREMENTS, CONTENT_SCOPES } from "@/types/enums";

const objectIdString = z.string().refine((value) => ObjectId.isValid(value), { message: "Id inválido." });

const baseFields = {
  type: z.enum(CONTENT_ITEM_TYPES),
  scope: z.enum(CONTENT_SCOPES),
  roleIds: z.array(objectIdString).default([]),
  title: z.string().trim().min(2, { message: "El título debe tener al menos 2 caracteres." }),
  body: z.string().trim().min(1, { message: "El contenido no puede estar vacío." }),
  mediaId: objectIdString.optional(),
  // Validación/normalización real (allowlist YouTube/Vimeo/Loom) pasa en
  // el Service — acá solo se descarta lo que ni siquiera es una URL.
  videoUrl: z.string().trim().url({ message: "URL de video inválida." }).optional(),
  requirement: z.enum(CONTENT_REQUIREMENTS).nullable().default(null),
  order: z.number().int().positive().optional(),
};

function requireRoleIdsWhenScoped<T extends { scope: string; roleIds: string[] }>(data: T, ctx: z.RefinementCtx) {
  if (data.scope === "ROLE" && data.roleIds.length === 0) {
    ctx.addIssue({
      code: "custom",
      message: "Un content_item con scope ROLE necesita al menos un roleId.",
      path: ["roleIds"],
    });
  }
}

export const createContentItemSchema = z
  .object({ stageId: objectIdString, ...baseFields })
  .superRefine(requireRoleIdsWhenScoped);

export const updateContentItemSchema = z
  .object({
    type: baseFields.type.optional(),
    scope: baseFields.scope.optional(),
    roleIds: z.array(objectIdString).optional(),
    title: baseFields.title.optional(),
    body: baseFields.body.optional(),
    mediaId: objectIdString.nullable().optional(),
    videoUrl: z.string().trim().url({ message: "URL de video inválida." }).nullable().optional(),
    requirement: baseFields.requirement.optional(),
    order: baseFields.order,
  })
  .superRefine((data, ctx) => {
    if (data.scope === "ROLE" && data.roleIds && data.roleIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Un content_item con scope ROLE necesita al menos un roleId.",
        path: ["roleIds"],
      });
    }
  });
