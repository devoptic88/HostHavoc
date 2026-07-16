import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        night: {
          DEFAULT: "#05070D",
          50: "#0A0E17",
          100: "#0D1320",
          200: "#111827",
          300: "#151D2E",
        },
        steel: {
          DEFAULT: "#C8D0DC",
          dim: "#8A94A6",
          faint: "#5B6577",
        },
        hyper: {
          50: "#EBF2FF",
          100: "#D6E4FF",
          200: "#A8C7FF",
          300: "#75A6FF",
          400: "#4A86FF",
          500: "#2F6BFF",
          600: "#1D4ED8",
          700: "#173FB0",
          800: "#132F82",
          900: "#0F2258",
        },
        volt: "#38BDF8",
        success: "#34D399",
        warning: "#FBBF24",
        danger: "#F87171",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-exo)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "hyper-gradient": "linear-gradient(135deg, #1D4ED8 0%, #2F6BFF 50%, #38BDF8 100%)",
        "steel-gradient": "linear-gradient(180deg, #E5EAF2 0%, #9AA5B8 100%)",
        "grid-faint":
          "linear-gradient(rgba(47,107,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(47,107,255,0.06) 1px, transparent 1px)",
        "radial-glow":
          "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(47,107,255,0.28), transparent)",
      },
      boxShadow: {
        glow: "0 0 24px rgba(47,107,255,0.35)",
        "glow-sm": "0 0 12px rgba(56,189,248,0.25)",
        card: "0 8px 32px rgba(0,0,0,0.45)",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out both",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 16px rgba(47,107,255,0.25)" },
          "50%": { boxShadow: "0 0 32px rgba(56,189,248,0.45)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
