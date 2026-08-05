"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ConfirmSubmitButton({
  promptLabel,
  pendingLabel,
  children,
}: {
  promptLabel: string;
  pendingLabel?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      size="sm"
      variant="danger"
      type="submit"
      disabled={pending}
      onClick={(e) => {
        const typed = window.prompt(
          `Type delete to confirm deleting ${promptLabel}.`,
          "",
        );
        if (typed?.trim().toLowerCase() !== "delete") {
          e.preventDefault();
        }
      }}
    >
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {pendingLabel ?? "Deleting…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
