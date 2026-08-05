"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/utils";

/**
 * A labeled on/off row that saves itself the moment it's flipped — no
 * separate Submit button — and flashes a "Saved" confirmation that fades.
 */
export function AutoSaveToggleRow({
  icon,
  label,
  description,
  checked,
  onSave,
  trailing,
}: {
  icon?: ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onSave: (next: boolean) => Promise<void>;
  trailing?: ReactNode;
}) {
  const [value, setValue] = useState(checked);
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setValue(checked), [checked]);
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  async function handleChange(next: boolean) {
    setValue(next);
    setBusy(true);
    setError(null);
    try {
      await onSave(next);
      setSavedFlash(true);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setValue(!next);
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-white">
          {icon}
          {label}
        </p>
        <Toggle checked={value} disabled={busy} onChange={handleChange} />
        <span
          className={cn(
            "text-xs font-medium text-success transition-opacity duration-300",
            savedFlash ? "opacity-100" : "opacity-0",
          )}
        >
          Saved
        </span>
        {trailing}
      </div>
      {description && <p className="mt-1.5 max-w-xl text-xs text-steel-faint">{description}</p>}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
