import type { Metadata } from "next";
import { GamesGrid } from "@/components/marketing/GamesGrid";
import { Badge } from "@/components/ui/Badge";
import { Gamepad2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Game Server Hosting — All Games",
  description:
    "Browse every game HyperNode hosts. Instant setup, NVMe hardware, DDoS protection, and mod support on every server.",
};

export default function GamesPage() {
  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-96 bg-radial-glow" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-12 text-center">
          <Badge tone="blue" className="mb-4">
            <Gamepad2 className="h-3 w-3" /> 15+ games and counting
          </Badge>
          <h1 className="font-display text-4xl font-extrabold italic text-white sm:text-5xl">
            The highest-performing game servers,{" "}
            <span className="text-gradient-hyper">guaranteed</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-steel-dim">
            Every server ships with NVMe storage, DDoS protection, automated
            backups, and our custom control panel. Pick your game.
          </p>
        </div>
        <GamesGrid />
      </div>
    </div>
  );
}
