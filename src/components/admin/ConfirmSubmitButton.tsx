"use client";

import { Button } from "@/components/ui/Button";

export function ConfirmSubmitButton({
  promptLabel,
  children,
}: {
  promptLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="sm"
      variant="danger"
      type="submit"
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
      {children}
    </Button>
  );
}
