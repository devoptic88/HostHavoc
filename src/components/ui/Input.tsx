import { cn } from "@/lib/utils";
import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const fieldBase =
  "ring-focus w-full rounded-lg border border-white/10 bg-night-100 px-3.5 py-2.5 text-sm text-white placeholder:text-steel-faint transition-colors focus:border-hyper-500/60";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "min-h-[120px]", className)} {...props} />;
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldBase, "appearance-none", className)} {...props} />;
}

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-steel-dim",
        className,
      )}
      {...props}
    />
  );
}
