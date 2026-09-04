import { AUDIT_FIELD_LABELS } from "@/lib/audit-labels";

type Change = { before: unknown; after: unknown };

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (Array.isArray(value)) return value.length === 0 ? "(vacío)" : value.join(", ");
  return String(value);
}

/**
 * Columna "Detalles" de /admin/audit: el `changes` que arma `diffFields`
 * (ver src/lib/audit-diff.ts) en cada *_UPDATED, más el `title`/`name` que
 * ya se usa como fallback de la columna "Recurso". Sin esto, `metadata`
 * quedaba capturado en Mongo pero invisible en la UI — que era exactamente
 * el hueco que el usuario pidió cerrar ("qué cambió", no solo "quién y cuándo").
 */
export function AuditDetails({ metadata }: { metadata: Record<string, unknown> }) {
  const changes = metadata.changes as Record<string, Change> | undefined;
  if (!changes || Object.keys(changes).length === 0) {
    return <span className="text-xs text-ink-soft">—</span>;
  }

  return (
    <ul className="flex flex-col gap-0.5 text-xs text-ink-soft">
      {Object.entries(changes).map(([field, { before, after }]) => (
        <li key={field}>
          <span className="font-semibold text-ink">{AUDIT_FIELD_LABELS[field] ?? field}:</span> {formatValue(before)} →{" "}
          {formatValue(after)}
        </li>
      ))}
    </ul>
  );
}
