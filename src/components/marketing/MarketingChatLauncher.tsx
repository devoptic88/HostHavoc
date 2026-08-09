"use client";

import { MessageCircleMore } from "lucide-react";
import { openIntercom } from "@/components/dashboard/IntercomLauncher";
import { LogoMark } from "@/components/ui/Logo";

const SUPPORT_AVATARS = [
  { name: "Dustin", bg: "from-sky-300 to-hyper-500" },
  { name: "Avery", bg: "from-fuchsia-400 to-pink-500" },
  { name: "Kai", bg: "from-amber-300 to-orange-500" },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function MarketingChatLauncher() {
  return (
    <button
      id="hypernode-chat-launcher"
      type="button"
      onClick={() => {
        openIntercom();
      }}
      className="group fixed bottom-4 right-4 z-40 w-[calc(100vw-1rem)] max-w-[360px] overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(16,24,40,0.92),rgba(25,58,125,0.92)_42%,rgba(117,70,173,0.92)_100%)] p-4 text-left text-white shadow-[0_26px_70px_rgba(4,8,20,0.55)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_32px_90px_rgba(47,107,255,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-hyper-300 focus-visible:ring-offset-2 focus-visible:ring-offset-night sm:bottom-5 sm:right-5 sm:w-[min(360px,calc(100vw-1.5rem))] sm:p-5"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.15),transparent_35%)] opacity-90" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            <LogoMark className="h-6 w-6" />
          </span>
          <div>
            <div className="font-display text-sm font-bold uppercase tracking-[0.2em] text-white/80">
              HyperNode
            </div>
            <div className="text-sm text-white/60">Live support in minutes</div>
          </div>
        </div>
        <div className="flex -space-x-2">
          {SUPPORT_AVATARS.map((avatar) => (
            <span
              key={avatar.name}
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-night bg-gradient-to-br ${avatar.bg} text-xs font-semibold text-white shadow-lg`}
              aria-hidden="true"
            >
              {initials(avatar.name)}
            </span>
          ))}
        </div>
      </div>

      <div className="relative mt-4 sm:mt-5">
        <p className="max-w-[16ch] font-display text-[1.45rem] font-bold leading-[1.02] tracking-tight text-white sm:text-[1.75rem]">
          Questions before you order?
        </p>
        <p className="mt-2 max-w-[28ch] text-sm leading-6 text-white/72">
          Chat with our hosting team about setup, mods, migrations, or the right plan.
        </p>
      </div>

      <div className="relative mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:mt-5">
        <div>
          <div className="text-sm font-semibold text-white">Open live chat</div>
          <div className="text-xs text-white/60">Powered by Intercom</div>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-hyper-600 transition group-hover:scale-105">
          <MessageCircleMore className="h-5 w-5" />
        </span>
      </div>
    </button>
  );
}
