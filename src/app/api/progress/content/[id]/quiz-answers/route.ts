import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireActiveUser } from "@/server/auth/session";
import { toErrorResponse } from "@/server/errors/handler";
import { NotFoundError, ValidationError } from "@/server/errors";
import { zodErrorMessage } from "@/lib/zod-error";
import { submitQuizAnswerSchema } from "@/server/validation/quiz-answer.schema";
import { submitQuizAnswer, getMyQuizAnswers } from "@/server/services/quiz-answer.service";

// Se llama una vez por pregunta respondida (no recién al terminar el quiz)
// — ver QuizBlock.tsx: así cerrar el modal a medio responder no pierde lo
// ya contestado.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await requireActiveUser();
    const { id } = await params;
    if (!ObjectId.isValid(id)) throw new NotFoundError();

    const body = await request.json();
    const parsed = submitQuizAnswerSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(zodErrorMessage(parsed.error, "Respuesta de quiz inválida."), parsed.error.flatten());
    }

    await submitQuizAnswer(identity, new ObjectId(id), parsed.data.questionText, parsed.data.selectedOption);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

// QuizBlock lo pide al montarse, para retomar un quiz a medio responder
// (ver su comentario) en vez de arrancar siempre de cero.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await requireActiveUser();
    const { id } = await params;
    if (!ObjectId.isValid(id)) throw new NotFoundError();

    const answers = await getMyQuizAnswers(identity, new ObjectId(id));
    return NextResponse.json({ success: true, data: { answers } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
