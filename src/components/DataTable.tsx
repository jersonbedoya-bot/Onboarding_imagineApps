import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  header: string;
  render: (row: T) => ReactNode;
};

// Estructural, sin estilo definido: el lineamiento de diseño visual
// todavía no existe. Reusado por los listados de admin (usuarios, etapas,
// contenido, y lo que siga en 3B).
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
    return <p>{emptyMessage}</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.header}>{column.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)}>
            {columns.map((column) => (
              <td key={column.header}>{column.render(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
