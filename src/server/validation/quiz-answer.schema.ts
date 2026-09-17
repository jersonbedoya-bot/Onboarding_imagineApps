import { z } from "zod";

export const submitQuizAnswerSchema = z.object({
  questionText: z.string().trim().min(1, { message: "Falta el texto de la pregunta." }),
  selectedOption: z.string().trim().min(1, { message: "Falta la opción elegida." }),
});
