import { Badge } from "@/components/Badge";
import { cn } from "@/lib/cn";

/**
 * Indicador de "pendiente de definición o actualización" (Bloque 6) —
 * variante `neutral` a propósito: visible pero no alarmante, para no dar a
 * entender que el resto del contenido está mal (ver pending-content.ts).
 */
export function PendingBadge({ className }: { className?: string }) {
  return (
    <Badge variant="neutral" className={cn("shrink-0", className)}>
      <span aria-hidden="true">⚠️</span> Pendiente de actualización
    </Badge>
  );
}
