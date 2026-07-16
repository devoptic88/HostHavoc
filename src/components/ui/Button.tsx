import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-hyper-gradient text-white shadow-glow-sm hover:shadow-glow hover:brightness-110 border border-hyper-400/30",
  secondary:
    "glass text-steel hover:bg-white/[0.07] hover:text-white",
  outline:
    "border border-hyper-500/50 text-hyper-300 hover:bg-hyper-500/10 hover:border-hyper-400",
  ghost: "text-steel-dim hover:text-white hover:bg-white/[0.05]",
  danger:
    "bg-danger/10 border border-danger/40 text-danger hover:bg-danger/20",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

const base =
  "ring-focus inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  href,
  children,
  ...props
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  href: string;
  children: ReactNode;
  target?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </Link>
  );
}
