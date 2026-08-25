type ClassValue = string | false | null | undefined;

/** Merge de classNames condicionales — evita instalar clsx para esto. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
