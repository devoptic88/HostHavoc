import type { ReactNode } from "react";

export function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="mt-0.5 text-steel-dim">{icon}</span>
      <div>
        <h1 className="font-display text-xl font-extrabold italic text-white">{title}</h1>
        <p className="mt-1 text-sm text-steel-faint">{description}</p>
      </div>
    </div>
  );
}
