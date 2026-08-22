import { z } from "zod";
import { ObjectId } from "mongodb";

const objectIdString = z.string().refine((value) => ObjectId.isValid(value), {
  message: "Id inválido.",
});

export const changeFunctionalRoleSchema = z.object({
  functionalRoleId: objectIdString,
});
