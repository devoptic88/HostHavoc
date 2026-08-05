"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

/** Submit button for a `<form action={serverAction}>` that shows a spinner while the action runs. */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "secondary",
  size = "sm",
}: {
  children: ReactNode;
  pendingLabel?: ReactNode;
  variant?: Variant;
  size?: Size;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {pendingLabel ?? "Working…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
