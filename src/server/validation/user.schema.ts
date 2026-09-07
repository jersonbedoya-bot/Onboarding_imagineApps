import { z } from "zod";
import { ObjectId } from "mongodb";

const objectIdString = z.string().refine((value) => ObjectId.isValid(value), {
  message: "Id inválido.",
});

export const changeFunctionalRoleSchema = z.object({
  functionalRoleId: objectIdString,
});

// Misma política que acceptInvitationSchema (el usuario elige su propia
// contraseña al aceptar la invitación) — acá es el admin quien la fija a
// mano, no hay envío de correo para que el usuario la recupere solo.
export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres." })
    .regex(/[a-zA-Z]/, { message: "Debe contener al menos una letra." })
    .regex(/[0-9]/, { message: "Debe contener al menos un número." }),
});

// Mismo invariante que createInvitationSchema: USER necesita rol funcional,
// EDITOR/ADMIN no tienen uno (ver PLATFORM_ROLES en types/enums.ts).
export const changePlatformRoleSchema = z
  .object({
    platformRole: z.enum(["USER", "EDITOR", "ADMIN"]),
    functionalRoleId: objectIdString.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.platformRole === "USER" && !data.functionalRoleId) {
      ctx.addIssue({ code: "custom", message: "Un usuario necesita un rol funcional.", path: ["functionalRoleId"] });
    }
    if (data.platformRole !== "USER" && data.functionalRoleId) {
      ctx.addIssue({ code: "custom", message: "Editores y administradores no tienen rol funcional.", path: ["functionalRoleId"] });
    }
  });
