"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

export function MobileMenu({
  links,
  loggedIn,
  isAdmin,
}: {
  links: { href: string; label: string }[];
  loggedIn: boolean;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        aria-label="Toggle menu"
        onClick={() => setOpen((v) => !v)}
        className="ring-focus rounded-lg p-2 text-steel hover:bg-white/[0.05]"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <div className="glass-strong absolute inset-x-0 top-16 border-x-0 px-4 py-4">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-steel-dim hover:bg-white/[0.05] hover:text-white"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-3 flex gap-3 border-t border-white/[0.06] pt-4">
              {loggedIn ? (
                <ButtonLink
                  href={isAdmin ? "/admin" : "/dashboard"}
                  variant="primary"
                  size="sm"
                  className="flex-1"
                >
                  {isAdmin ? "Admin Panel" : "Dashboard"}
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink href="/login" variant="secondary" size="sm" className="flex-1">
                    Log in
                  </ButtonLink>
                  <ButtonLink href="/register" variant="primary" size="sm" className="flex-1">
                    Get Started
                  </ButtonLink>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
