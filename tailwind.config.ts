import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      tablet: "640px",
      lg: "1024px",
      desktop: "1024px",
      xl: "1280px",
      "2xl": "1536px",
      wide: "1536px",
    },
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          DEFAULT: "var(--surface)",
          elevated: "var(--surface-elevated)",
          subtle: "var(--surface-subtle)",
          border: "var(--surface-border)",
        },
        brand: {
          50: "#fff1f2",
          100: "#ffe4e6",
          500: "#f43f5e",
          600: "#e11d48",
          700: "#be123c",
          accent: "#ff0055",
        },
        tier: {
          1: "#f59e0b", // Gold / Tier 1
          2: "#06b6d4", // Cyan / Tier 2
          3: "#8b5cf6", // Purple / Tier 3
        },
        state: {
          live: "#ef4444",
          upcoming: "#3b82f6",
          released: "#10b981",
          scheduled: "#f59e0b",
          unconfirmed: "#6b7280",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        devanagari: ["var(--font-devanagari)", "system-ui"],
        tamil: ["var(--font-tamil)", "system-ui"],
        telugu: ["var(--font-telugu)", "system-ui"],
        kannada: ["var(--font-kannada)", "system-ui"],
        malayalam: ["var(--font-malayalam)", "system-ui"],
        bengali: ["var(--font-bengali)", "system-ui"],
        gurmukhi: ["var(--font-gurmukhi)", "system-ui"],
      },
      animation: {
        "pulse-glow": "pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "drop-flash": "dropFlash 1.5s ease-out",
        ticker: "ticker 25s linear infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 15px rgba(244, 63, 94, 0.6)" },
          "50%": { opacity: "0.6", boxShadow: "0 0 5px rgba(244, 63, 94, 0.2)" },
        },
        dropFlash: {
          "0%": { backgroundColor: "rgba(244, 63, 94, 0.35)", transform: "scale(1.02)" },
          "100%": { backgroundColor: "transparent", transform: "scale(1)" },
        },
        ticker: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
