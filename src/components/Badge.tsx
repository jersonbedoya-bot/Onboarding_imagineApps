import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "brand" | "success" | "danger" | "neutral";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  brand: "bg-brand-tint text-brand-strong border-brand-soft",
  success: "bg-success-soft text-success border-success-soft",
  danger: "bg-danger-soft text-danger border-danger-soft",
  neutral: "bg-paper text-ink-soft border-line",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ variant = "brand", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
