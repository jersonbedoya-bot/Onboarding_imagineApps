import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type StepStatus = "complete" | "current" | "locked" | "pending";

const CIRCLE_CLASSES: Record<StepStatus, string> = {
  complete: "bg-success border-success text-white",
  current: "bg-brand border-brand text-white",
  locked: "bg-paper border-line text-ink-soft",
  pending: "bg-card border-line text-ink-soft",
};

const LABEL_CLASSES: Record<StepStatus, string> = {
  complete: "text-ink-soft line-through decoration-success decoration-2",
  current: "text-ink font-semibold",
  locked: "text-ink-soft",
  pending: "text-ink",
};

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === "complete") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "locked") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
        <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth={2} />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth={2} />
      </svg>
    );
  }
  return null;
}

export type StepIndicatorProps = {
  status: StepStatus;
  label: string;
  index?: number;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
};

/** Fila de checklist con estado — usada tanto para etapas del recorrido como para pasos de un proceso. */
export function StepIndicator({ status, label, index, trailing, onClick, className }: StepIndicatorProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3.5 rounded-md px-3 py-2.5 text-left transition-colors",
        onClick && "cursor-pointer hover:bg-brand-tint",
        className,
      )}
    >
      <span
        className={cn(
          "grid h-6 w-6 flex-shrink-0 place-items-center rounded-md border-2 text-[13px] font-bold tabular-nums transition-colors",
          CIRCLE_CLASSES[status],
        )}
      >
        <StatusIcon status={status} />
        {status !== "complete" && status !== "locked" && index !== undefined ? index : null}
      </span>
      <span className={cn("flex-1 text-sm", LABEL_CLASSES[status])}>{label}</span>
      {trailing}
    </Comp>
  );
}
