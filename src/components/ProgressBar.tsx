export type ProgressBarProps = {
  value: number; // 0-100
  label?: string;
};

export function ProgressBar({ value, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-soft">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-strong to-brand transition-[width] duration-700 ease-out"
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {label && <span className="whitespace-nowrap text-xs font-bold tabular-nums text-brand">{label}</span>}
    </div>
  );
}
