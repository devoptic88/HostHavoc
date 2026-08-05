"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

/** Shows a masked address until the customer asks to see it — safe for streaming. */
export function RevealEmail({ email }: { email: string }) {
  const [shown, setShown] = useState(false);
  const [local, domain] = email.split("@");
  const masked = `${local.slice(0, 1)}${"*".repeat(Math.max(1, local.length - 1))}@${domain}`;

  return (
    <span className="flex flex-wrap items-center gap-2">
      <Mail className="h-4 w-4 shrink-0 text-steel-faint" />
      <span className="font-mono text-sm text-white">{shown ? email : masked}</span>
      <button
        type="button"
        onClick={() => setShown((prev) => !prev)}
        className="ring-focus rounded text-xs text-hyper-300 hover:text-white"
      >
        {shown ? "hide" : "reveal"}
      </button>
    </span>
  );
}
