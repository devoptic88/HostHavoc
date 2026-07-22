import type { Metadata } from "next";
import { Manrope, Bitter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Manrope({ subsets: ["latin"], variable: "--font-inter" });
const exo = Bitter({
  subsets: ["latin"],
  variable: "--font-exo",
  style: ["normal", "italic"],
});
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "HyperNode — High-Performance Game Server Hosting",
    template: "%s | HyperNode",
  },
  description:
    "Deploy high-performance game servers in minutes. NVMe hardware, DDoS protection, instant setup, and 24/7 support. Powered by HyperNode.",
  openGraph: {
    siteName: "HyperNode",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${exo.variable} ${mono.variable} min-h-screen bg-night font-sans text-steel antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
