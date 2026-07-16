import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        title="Admin Control"
        footerNote={session.user.email}
        items={[
          { href: "/admin", label: "Overview", icon: "overview", exact: true },
          { href: "/admin/orders", label: "Orders", icon: "orders" },
          { href: "/admin/plans", label: "Plans", icon: "plans" },
          { href: "/admin/customers", label: "Customers", icon: "customers" },
          { href: "/admin/tickets", label: "Tickets", icon: "support" },
          { href: "/admin/servers", label: "Servers", icon: "server" },
          { href: "/admin/nodes", label: "Nodes", icon: "nodes" },
          { href: "/admin/locations", label: "Locations", icon: "locations" },
          { href: "/admin/eggs", label: "Nests & Eggs", icon: "eggs" },
          { href: "/admin/blog", label: "Blog", icon: "blog" },
          { href: "/admin/wiki", label: "Wiki", icon: "wiki" },
          { href: "/admin/settings", label: "Settings", icon: "settings" },
        ]}
      />
      <main className="flex-1 px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
