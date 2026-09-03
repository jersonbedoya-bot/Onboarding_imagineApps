export type ErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/**
 * Recurso inexistente para el tenant del usuario autenticado.
 * Se usa tanto para "no existe" real como para el caso cross-tenant
 * (un recurso de OTRO tenant): nunca confirmamos su existencia ajena.
 */
export class NotFoundError extends AppError {
  constructor(message = "El recurso solicitado no existe.") {
    super("NOT_FOUND", 404, message);
  }
}

/**
 * El recurso existe en el tenant correcto, pero el platformRole del
 * usuario no alcanza para la acción solicitada.
 */
export class ForbiddenError extends AppError {
  constructor(message = "No tienes permisos para realizar esta acción.") {
    super("FORBIDDEN", 403, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Debes iniciar sesión para continuar.") {
    super("UNAUTHORIZED", 401, message);
  }
}

export class ValidationError extends AppError {
  readonly details?: unknown;

  constructor(message = "Los datos enviados no son válidos.", details?: unknown) {
    super("VALIDATION_ERROR", 400, message);
    this.details = details;
  }
}

export class RateLimitedError extends AppError {
  constructor(message = "Demasiados intentos. Espera unos minutos y vuelve a intentar.") {
    super("RATE_LIMITED", 429, message);
  }
}
