import { z } from "zod";
import { ObjectId } from "mongodb";

const objectIdString = z.string().refine((value) => ObjectId.isValid(value), {
  message: "Id inválido.",
});

export const createInvitationSchema = z
  .object({
    email: z.string().trim().email({ message: "Email inválido." }),
    platformRole: z.enum(["USER", "ADMIN"]).default("USER"),
    functionalRoleId: objectIdString.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.platformRole === "USER" && !data.functionalRoleId) {
      ctx.addIssue({ code: "custom", message: "Un usuario necesita un rol funcional.", path: ["functionalRoleId"] });
    }
    if (data.platformRole === "ADMIN" && data.functionalRoleId) {
      ctx.addIssue({ code: "custom", message: "Un administrador no tiene rol funcional.", path: ["functionalRoleId"] });
    }
  });

// Misma política que documenta la guía oficial de Next.js para signup forms.
export const acceptInvitationSchema = z.object({
  name: z.string().trim().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  password: z
    .string()
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres." })
    .regex(/[a-zA-Z]/, { message: "Debe contener al menos una letra." })
    .regex(/[0-9]/, { message: "Debe contener al menos un número." }),
});
