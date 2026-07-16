import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  glow = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { glow?: boolean }) {
  return (
    <div
      className={cn(
        "glass rounded-2xl shadow-card",
        glow && "transition-shadow duration-300 hover:shadow-glow",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-white/[0.06] px-6 py-4", className)} {...props} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display text-lg font-bold text-white", className)}
      {...props}
    />
  );
}
