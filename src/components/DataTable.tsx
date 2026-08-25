import type { ReactNode } from "react";
import { EmptyState } from "@/components/EmptyState";

export type DataTableColumn<T> = {
  header: string;
  render: (row: T) => ReactNode;
};

/** Listado tabular reusado en todo el admin (usuarios, etapas, contenido, auditoría, ...). */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "Sin resultados.",
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyMessage} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-card shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-paper">
            {columns.map((column) => (
              <th
                key={column.header}
                className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ink-soft"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-line last:border-0 hover:bg-brand-tint/40">
              {columns.map((column) => (
                <td key={column.header} className="px-4 py-3 text-ink">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
