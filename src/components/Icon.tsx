import type { ReactNode, SVGProps } from "react";

/**
 * Sistema de iconos unificado del admin.
 *
 * Causa raíz que resuelve: los iconos estaban dispersos como <svg> inline
 * con tamaños, trazos y espaciados inconsistentes (h-3.5, h-4, h-8;
 * strokeWidth 2/2.5/3) a través de Modal, PasswordInput, Toast,
 * StepIndicator, ArchivedSection, etc. Este componente centraliza TODOS los
 * iconos con:
 *  - Un único viewBox (24×24) y trazo por defecto 2.
 *  - Tamaño por token (sm=14px, md=16px, lg=20px, xl=28px) desde una sola constante.
 *  - `color: currentColor` para que herede el color del contexto.
 *
 * Uso: <Icon name="edit" size="sm" />
 */
export type IconName =
  | "archive"
  | "check"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "close"
  | "crown"
  | "edit"
  | "eye"
  | "grid"
  | "list"
  | "logout"
  | "plus"
  | "reactivate"
  | "route"
  | "trash"
  | "users"
  | "view";

type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  size?: "sm" | "md" | "lg" | "xl";
};

const SIZE_CLASSES: Record<NonNullable<IconProps["size"]>, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
  xl: "h-7 w-7",
};

/** Los paths reutilizan el MISMO trazo (strokeWidth={2}) y strokeLinecap/join "round". */
const PATHS: Record<IconName, ReactNode> = {
  archive: (
    <>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </>
  ),
  check: <path d="M5 13l4 4L19 7" />,
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  "chevron-left": <path d="M15 18l-6-6 6-6" />,
  "chevron-right": <path d="M9 6l6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  crown: (
    <>
      <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z" />
      <path d="M5 19h14" />
    </>
  ),
  edit: (
    <>
      <path d="M17 3l4 4L8 20l-5 1 1-5L17 3z" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  eye: (
    <>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  reactivate: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v4h4" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="5" r="2" />
      <path d="M8 19h8a4 4 0 0 0 0-8H8a4 4 0 0 1 0-8h8" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
      <path d="M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
  view: <path d="M2 12s4-9 10-9 10 9 10 9-4 9-10 9-10-9-10-9z" />,
};

export function Icon({ name, size = "md", className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`${SIZE_CLASSES[size]} flex-shrink-0 ${className ?? ""}`}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

const ICON_LABELS: Record<IconName, string> = {
  archive: "Archivar",
  check: "Confirmar",
  "chevron-down": "Desplegar",
  "chevron-left": "Anterior",
  "chevron-right": "Siguiente",
  close: "Cerrar",
  crown: "Líderes",
  edit: "Editar",
  eye: "Visibilidad",
  grid: "Módulos",
  list: "Lista",
  logout: "Cerrar sesión",
  plus: "Añadir",
  reactivate: "Reactivar",
  route: "Ruta",
  trash: "Eliminar",
  users: "Usuarios",
  view: "Ver",
};

/** Helper para tooltips/acciones accesibles cuando el icono va solo (sin texto). */
export function iconLabel(name: IconName): string {
  return ICON_LABELS[name];
}
