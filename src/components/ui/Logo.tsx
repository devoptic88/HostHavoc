import Link from "next/link";
import { cn } from "@/lib/utils";

// SVG wordmark matching the HyperNode brand: angular italic caps,
// "HYPER" in brushed steel, "NODE" in electric blue.
export function Logo({
  className,
  href = "/",
  withTagline = false,
}: {
  className?: string;
  href?: string;
  withTagline?: boolean;
}) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)}>
      <LogoMark className="h-8 w-8 transition-transform duration-300 group-hover:scale-105" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-extrabold italic tracking-tight">
          <span className="text-gradient-steel">HYPER</span>
          <span className="text-gradient-hyper">NODE</span>
        </span>
        {withTagline && (
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.35em] text-steel-faint">
            Game Server Hosting
          </span>
        )}
      </span>
    </Link>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="hn-steel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E5EAF2" />
          <stop offset="100%" stopColor="#8A94A6" />
        </linearGradient>
        <linearGradient id="hn-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="60%" stopColor="#2F6BFF" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      {/* H — steel server towers */}
      <path d="M8 6h7v14h6V6h4v36h-4V28h-6v14H8V6z" fill="url(#hn-steel)" transform="skewX(-6)" transformOrigin="24 24" />
      {/* N — blue diagonal */}
      <path
        d="M28 6h5l7 22V6h5v36h-5l-7-22v22h-5V6z"
        fill="url(#hn-blue)"
        transform="skewX(-6)"
        transformOrigin="24 24"
      />
      {/* status LEDs */}
      <circle cx="11.5" cy="10" r="1" fill="#38BDF8" opacity="0.9" />
      <circle cx="11.5" cy="14" r="1" fill="#38BDF8" opacity="0.5" />
    </svg>
  );
}
