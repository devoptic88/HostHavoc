import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard");

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        title="Customer Area"
        footerNote={session.user.email}
        hiddenPathPrefixes={["/dashboard/servers/"]}
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
      <main className="flex-1 px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
