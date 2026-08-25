import { cn } from "@/lib/cn";

export type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-md bg-line", className)} aria-hidden="true" />;
}
