import { z } from "zod";
import { ObjectId } from "mongodb";
import { CONTENT_SCOPES } from "@/types/enums";

const objectIdString = z.string().refine((value) => ObjectId.isValid(value), { message: "Id inválido." });

const baseFields = {
  name: z.string().trim().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  title: z.string().trim().min(2, { message: "El cargo debe tener al menos 2 caracteres." }),
  description: z.string().trim().default(""),
  photoMediaId: objectIdString.optional(),
  videoUrl: z.string().trim().url({ message: "URL de video inválida." }).optional(),
  scope: z.enum(CONTENT_SCOPES),
  roleIds: z.array(objectIdString).default([]),
  order: z.number().int().positive().optional(),
};

function requireRoleIdsWhenScoped<T extends { scope: string; roleIds: string[] }>(data: T, ctx: z.RefinementCtx) {
  if (data.scope === "ROLE" && data.roleIds.length === 0) {
    ctx.addIssue({ code: "custom", message: "Un líder con scope ROLE necesita al menos un roleId.", path: ["roleIds"] });
  }
}

export const createLeaderSchema = z.object(baseFields).superRefine(requireRoleIdsWhenScoped);

export const updateLeaderSchema = z
  .object({
    name: baseFields.name.optional(),
    title: baseFields.title.optional(),
    description: baseFields.description.optional(),
    photoMediaId: objectIdString.nullable().optional(),
    videoUrl: z.string().trim().url({ message: "URL de video inválida." }).nullable().optional(),
    scope: baseFields.scope.optional(),
    roleIds: z.array(objectIdString).optional(),
    order: baseFields.order,
  })
  .superRefine((data, ctx) => {
    if (data.scope === "ROLE" && data.roleIds && data.roleIds.length === 0) {
      ctx.addIssue({ code: "custom", message: "Un líder con scope ROLE necesita al menos un roleId.", path: ["roleIds"] });
    }
  });
