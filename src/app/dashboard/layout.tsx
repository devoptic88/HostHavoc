import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { GAMES } from "@/content/games";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard");

  const [activeServices, openTickets] = await Promise.all([
    db.order.count({
      where: {
        userId: session.user.id,
        status: { in: ["ACTIVE", "PROVISIONING", "PENDING", "GRACE_PERIOD", "MANUAL"] },
      },
    }),
    db.ticket.count({
      where: {
        userId: session.user.id,
        status: { in: ["OPEN", "STAFF_REPLY", "CUSTOMER_REPLY"] },
      },
    }),
  ]);

  return (
    <div className="dashboard-shell flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        title="Customer Area"
        footerNote={session.user.email}
        hiddenPathPrefixes={["/dashboard/servers/"]}
        promo={{
          cta: { href: "/games", label: "Deploy New Server" },
          stats: [
            { label: "Active Services", value: String(activeServices) },
            { label: "Open Tickets", value: String(openTickets) },
            { label: "Games Available", value: String(GAMES.length) },
          ],
        }}
        portalSwitch={
          session.user.role === "ADMIN"
            ? { href: "/admin", label: "Open Admin Panel" }
            : undefined
        }
        items={[
          { href: "/dashboard", label: "My Servers", icon: "server", exact: true },
          { href: "/dashboard/billing", label: "Billing", icon: "billing" },
          { href: "/dashboard/tickets", label: "Support", icon: "support" },
          { href: "/dashboard/account", label: "Account", icon: "account" },
        ]}
      />
      <main className="relative flex-1 px-4 py-8 sm:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.22),transparent_45%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_35%)]" />
        <div className="relative">{children}</div>
      </main>
    </div>
  );
}
