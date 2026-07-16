import type { Metadata } from "next";
import { GamesGrid } from "@/components/marketing/GamesGrid";
import { Badge } from "@/components/ui/Badge";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
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
        <Stagger className="mb-12 text-center">
          <StaggerItem>
            <Badge tone="blue" className="mb-4">
              <Gamepad2 className="h-3 w-3" /> 16 games and counting
            </Badge>
          </StaggerItem>
          <StaggerItem>
            <h1 className="font-display text-4xl font-extrabold italic text-white sm:text-5xl">
              The highest-performing game servers,{" "}
              <span className="text-gradient-hyper">guaranteed</span>
            </h1>
          </StaggerItem>
          <StaggerItem>
            <p className="mx-auto mt-4 max-w-xl text-steel-dim">
              Every server ships with NVMe storage, DDoS protection, automated
              backups, and our custom control panel. Pick your game.
            </p>
          </StaggerItem>
        </Stagger>
        <GamesGrid />
      </div>
    </div>
  );
}
