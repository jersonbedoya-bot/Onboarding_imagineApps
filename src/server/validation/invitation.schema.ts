import { z } from "zod";
import { ObjectId } from "mongodb";

const objectIdString = z.string().refine((value) => ObjectId.isValid(value), {
  message: "Id inválido.",
});

export const createInvitationSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido." }),
  functionalRoleId: objectIdString,
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
