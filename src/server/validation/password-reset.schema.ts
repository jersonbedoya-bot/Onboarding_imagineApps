import { z } from "zod";
import { resetPasswordSchema } from "@/server/validation/user.schema";

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email({ message: "Escribe un email válido." }),
});

// Misma política de fuerza que acceptInvitation y el reset manual del admin.
export const completePasswordResetSchema = resetPasswordSchema;
