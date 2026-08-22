import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { AppError } from "./index";

type ErrorBody = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

/**
 * Único punto de traducción de errores a respuesta HTTP.
 * Nunca expone stack traces, queries ni detalles internos (regla 51):
 * lo que no es un AppError conocido colapsa a un mensaje genérico y
 * el detalle real solo queda en el log del servidor.
 */
export function toErrorResponse(error: unknown): NextResponse<ErrorBody> {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...("details" in error && error.details !== undefined ? { details: error.details } : {}),
        },
      },
      { status: error.status },
    );
  }

  logger.error("unhandled_error", {
    message: error instanceof Error ? error.message : String(error),
  });

  return NextResponse.json(
    {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Ocurrió un error inesperado." },
    },
    { status: 500 },
  );
}
