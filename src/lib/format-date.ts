/**
 * Formato de fechas para mostrar en la UI, siempre en hora de Colombia.
 *
 * Sin `timeZone`, Intl usa la zona del proceso que renderiza: en Vercel los
 * Server Components corren en UTC, así que la auditoría mostraba las horas
 * 5 horas adelantadas (ver feedback de usuario). Fijar la zona acá también
 * hace que un componente cliente muestre lo mismo sin importar desde qué
 * país se abra.
 */
const TIME_ZONE = "America/Bogota";
const LOCALE = "es-CO";

export function formatDate(date: Date | string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: TIME_ZONE }).format(new Date(date));
}
