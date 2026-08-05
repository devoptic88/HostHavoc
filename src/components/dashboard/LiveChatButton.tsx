"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { openIntercom } from "@/components/dashboard/IntercomLauncher";

export function LiveChatButton({
  configured,
  className,
}: {
  configured: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!configured) {
    return (
      <p className={className}>
        <span className="text-sm text-steel-faint">
          Live chat isn&apos;t switched on yet — open a ticket and we&apos;ll pick it up there.
        </span>
      </p>
    );
  }

  return (
    <div className={className}>
      <Button
        variant="primary"
        size="sm"
        onClick={() => {
          if (!openIntercom()) setFailed(true);
        }}
      >
        <MessageCircle className="h-4 w-4" /> Start live chat
      </Button>
      {failed && (
        <p className="mt-2 text-xs text-warning">
          The chat widget is still loading. Give it a moment and try again.
        </p>
      )}
    </div>
  );
}
