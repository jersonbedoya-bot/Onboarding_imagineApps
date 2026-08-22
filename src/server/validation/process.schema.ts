import { z } from "zod";
import { ObjectId } from "mongodb";
import { CONTENT_SCOPES } from "@/types/enums";

const objectIdString = z.string().refine((value) => ObjectId.isValid(value), { message: "Id inválido." });

const baseFields = {
  scope: z.enum(CONTENT_SCOPES),
  roleIds: z.array(objectIdString).default([]),
  title: z.string().trim().min(2, { message: "El título debe tener al menos 2 caracteres." }),
  objective: z.string().trim().default(""),
  context: z.string().trim().default(""),
  expectedResult: z.string().trim().default(""),
  resources: z.array(z.string().trim()).default([]),
  order: z.number().int().positive().optional(),
};

function requireRoleIdsWhenScoped<T extends { scope: string; roleIds: string[] }>(data: T, ctx: z.RefinementCtx) {
  if (data.scope === "ROLE" && data.roleIds.length === 0) {
    ctx.addIssue({ code: "custom", message: "Un proceso con scope ROLE necesita al menos un roleId.", path: ["roleIds"] });
  }
}

export const createProcessSchema = z.object({ stageId: objectIdString, ...baseFields }).superRefine(requireRoleIdsWhenScoped);

export const updateProcessSchema = z
  .object({
    scope: baseFields.scope.optional(),
    roleIds: z.array(objectIdString).optional(),
    title: baseFields.title.optional(),
    objective: baseFields.objective.optional(),
    context: baseFields.context.optional(),
    expectedResult: baseFields.expectedResult.optional(),
    resources: baseFields.resources.optional(),
    order: baseFields.order,
  })
  .superRefine((data, ctx) => {
    if (data.scope === "ROLE" && data.roleIds && data.roleIds.length === 0) {
      ctx.addIssue({ code: "custom", message: "Un proceso con scope ROLE necesita al menos un roleId.", path: ["roleIds"] });
    }
  });
