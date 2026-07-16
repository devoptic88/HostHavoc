import Link from "next/link";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { MobileMenu } from "./MobileMenu";

export const NAV_LINKS = [
  { href: "/games", label: "Game Servers" },
  { href: "/vps", label: "VPS" },
  { href: "/dedicated", label: "Dedicated" },
  { href: "/wiki", label: "Wiki" },
  { href: "/blog", label: "Blog" },
  { href: "/status", label: "Status" },
];

export async function Navbar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50">
      <div className="glass-strong border-x-0 border-t-0">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-steel-dim transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            {session?.user ? (
              <ButtonLink
                href={session.user.role === "ADMIN" ? "/admin" : "/dashboard"}
                variant="primary"
                size="sm"
              >
                {session.user.role === "ADMIN" ? "Admin Panel" : "Dashboard"}
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/login" variant="ghost" size="sm">
                  Log in
                </ButtonLink>
                <ButtonLink href="/register" variant="primary" size="sm">
                  Get Started
                </ButtonLink>
              </>
            )}
          </div>
          <MobileMenu
            links={NAV_LINKS}
            loggedIn={Boolean(session?.user)}
            isAdmin={session?.user?.role === "ADMIN"}
          />
        </div>
      </div>
    </header>
  );
}
