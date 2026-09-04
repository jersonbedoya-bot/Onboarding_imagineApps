import { z } from "zod";
import { ObjectId } from "mongodb";

const objectIdString = z.string().refine((value) => ObjectId.isValid(value), {
  message: "Id inválido.",
});

export const changeFunctionalRoleSchema = z.object({
  functionalRoleId: objectIdString,
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
