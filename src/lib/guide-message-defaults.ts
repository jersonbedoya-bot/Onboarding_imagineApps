// Textos de fábrica de /admin/messages. Viven fuera de route.service para
// que RouteContentForm (cliente) pueda ofrecer "Restaurar texto original"
// sin duplicarlos.
export const DEFAULT_HEADLINE = "Vamos paso a paso";
export const DEFAULT_SUBTITLE = "Recorre cada módulo y completa los pasos de tu rol.";
export const DEFAULT_BLOCKED_NEXT_MESSAGE = "Completa lo pendiente de este módulo para avanzar.";
export const DEFAULT_PENDING_CONTENT_MESSAGE = "Una parte de este contenido está en revisión — el texto definitivo todavía no está disponible.";

// Mismos máximos que route.schema.ts — el formulario los muestra como contador.
export const BLOCKED_NEXT_MESSAGE_MAX = 200;
export const PENDING_CONTENT_MESSAGE_MAX = 300;
