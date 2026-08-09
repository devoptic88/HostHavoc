import Link from "next/link";
import { IntercomLauncher } from "@/components/dashboard/IntercomLauncher";
import { Footer } from "@/components/marketing/Footer";
import { MarketingChatLauncher } from "@/components/marketing/MarketingChatLauncher";
import { Navbar } from "@/components/marketing/Navbar";
import { intercomAppId } from "@/lib/settings";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const appId = await intercomAppId();

  return (
    <div className="flex min-h-screen flex-col">
      <div className="relative overflow-hidden bg-hyper-gradient px-4 py-1.5 text-center text-xs font-semibold text-white">
        <div className="pointer-events-none absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent motion-reduce:hidden" />
        <span aria-hidden="true">⚡ </span>
        Launch offer - save 15% for life on new services with code{" "}
        <span className="rounded bg-white/20 px-1.5 py-0.5 font-mono">HYPER15</span>{" "}
        <Link href="/games" className="relative underline underline-offset-2">
          Deploy now →
        </Link>
      </div>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      {appId ? (
        <>
          <MarketingChatLauncher />
          <IntercomLauncher
            appId={appId}
            settings={{
              hideDefaultLauncher: true,
              customLauncherSelector: "#hypernode-chat-launcher",
              alignment: "right",
              horizontalPadding: 20,
              verticalPadding: 20,
              themeMode: "dark",
              actionColor: "#2F6BFF",
              backgroundColor: "#111827",
              zIndex: 60,
            }}
          />
        </>
      ) : null}
    </div>
  );
}
