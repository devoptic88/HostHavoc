import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import Link from "next/link";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-hyper-gradient px-4 py-1.5 text-center text-xs font-semibold text-white">
        ⚡ Launch offer — save 15% for life on new services with code{" "}
        <span className="rounded bg-white/20 px-1.5 py-0.5 font-mono">HYPER15</span>{" "}
        <Link href="/games" className="underline underline-offset-2">
          Deploy now →
        </Link>
      </div>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
