import type { ReactNode } from "react";

export type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

/** Encabezado de página, usado por las 7 pantallas de /admin — un solo lugar para el estilo. */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}
