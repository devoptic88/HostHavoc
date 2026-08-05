import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { IntercomLauncher } from "@/components/dashboard/IntercomLauncher";
import { accountUsage, formatQuotaBytes } from "@/lib/accountUsage";
import { intercomAppId } from "@/lib/settings";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard");

  const [usage, appId] = await Promise.all([
    accountUsage(session.user.id),
    intercomAppId(),
  ]);

  return (
    <div className="dashboard-shell flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        title="Customer Area"
        footerNote={session.user.email}
        hiddenPathPrefixes={["/dashboard/servers/"]}
        promo={{
          cta: { href: "/games", label: "Buy New Server" },
          meters: [
            {
              label: "Deployed Servers",
              value: String(usage.deployed),
              max: String(usage.deploySlots),
              percent: usage.deploySlots ? (usage.deployed / usage.deploySlots) * 100 : 0,
              note: usage.deployed >= usage.deploySlots ? "Buy to deploy more servers" : undefined,
              cta: usage.deployed >= usage.deploySlots ? { href: "/games", label: "Buy" } : undefined,
            },
            {
              label: "Saves",
              value: String(usage.saved),
              max: String(usage.saveSlots),
              percent: usage.saveSlots ? (usage.saved / usage.saveSlots) * 100 : 0,
              note: usage.saved >= usage.saveSlots ? "Upgrade to save more servers" : undefined,
              cta: usage.saved >= usage.saveSlots ? { href: "/games", label: "Upgrade" } : undefined,
            },
            {
              label: "Backup Storage",
              value: formatQuotaBytes(usage.backupBytes),
              max: formatQuotaBytes(usage.backupQuotaBytes),
              percent: usage.backupQuotaBytes
                ? (usage.backupBytes / usage.backupQuotaBytes) * 100
                : 0,
            },
          ],
        }}
        portalSwitch={
          session.user.role === "ADMIN"
            ? { href: "/admin", label: "Open Admin Panel" }
            : undefined
        }
        items={[
          {
            href: "/dashboard",
            label: "Dashboard",
            icon: "dashboard",
            exact: true,
            children: [
              { href: "/dashboard", label: "Deployed Servers", exact: true },
              { href: "/dashboard/saves", label: "Saved Servers" },
              { href: "/dashboard/storage", label: "Backups Storage" },
            ],
          },
          {
            href: "/dashboard/support",
            label: "Support Center",
            icon: "support",
            exact: true,
            children: [
              { href: "/dashboard/support/chat", label: "Live Chat" },
              { href: "/dashboard/tickets", label: "Tickets" },
            ],
          },
          { href: "/dashboard/billing", label: "Billing", icon: "billing" },
          { href: "/dashboard/account", label: "Settings", icon: "settings" },
        ]}
      />
      <main className="relative flex-1 px-4 py-8 sm:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.22),transparent_45%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_35%)]" />
        <div className="relative">{children}</div>
      </main>
      <IntercomLauncher
        appId={appId}
        user={{
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        }}
      />
    </div>
  );
}
