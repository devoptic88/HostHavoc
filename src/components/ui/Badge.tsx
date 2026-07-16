import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Tone = "blue" | "green" | "yellow" | "red" | "steel" | "violet";

const tones: Record<Tone, string> = {
  blue: "bg-hyper-500/15 text-hyper-300 border-hyper-500/30",
  green: "bg-success/10 text-success border-success/30",
  yellow: "bg-warning/10 text-warning border-warning/30",
  red: "bg-danger/10 text-danger border-danger/30",
  steel: "bg-white/[0.06] text-steel-dim border-white/10",
  violet: "bg-violet-500/10 text-violet-300 border-violet-500/30",
};

export function Badge({
  tone = "blue",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

const statusTones: Record<string, { tone: Tone; label: string; dot: string }> = {
  running: { tone: "green", label: "Online", dot: "bg-success" },
  starting: { tone: "yellow", label: "Starting", dot: "bg-warning" },
  stopping: { tone: "yellow", label: "Stopping", dot: "bg-warning" },
  offline: { tone: "steel", label: "Offline", dot: "bg-steel-faint" },
  installing: { tone: "blue", label: "Installing", dot: "bg-hyper-400" },
  suspended: { tone: "red", label: "Suspended", dot: "bg-danger" },
  install_failed: { tone: "red", label: "Install Failed", dot: "bg-danger" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = statusTones[status] ?? statusTones.offline;
  return (
    <Badge tone={s.tone}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot, status === "running" && "animate-pulse")} />
      {s.label}
    </Badge>
  );
}
