import { cn } from "@/lib/utils";

export function ProgressBar({
  percent,
  label,
  className,
}: {
  /** 0-100. Null/undefined renders an indeterminate (unknown-progress) bar. */
  percent?: number | null;
  label?: string;
  className?: string;
}) {
  const known = percent != null;
  const clamped = known ? Math.max(0, Math.min(100, percent!)) : 0;

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-steel-dim">
          <span className="truncate">{label}</span>
          {known && <span className="shrink-0 font-mono text-steel-faint">{Math.round(clamped)}%</span>}
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn(
            "h-full rounded-full bg-hyper-gradient transition-[width] duration-500 ease-out",
            !known && "w-1/3 animate-shimmer",
          )}
          style={known ? { width: `${clamped}%` } : undefined}
        />
      </div>
    </div>
  );
}
