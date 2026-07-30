import type { Config } from "tailwindcss";

/**
 * KARINA AI — Design system, expressed as Tailwind theme tokens.
 *
 * The single source of truth for palette + scale lives in
 * `src/lib/design/tokens.ts`. This config mirrors those decisions into
 * Tailwind utilities and wires the CSS custom properties defined in
 * `src/app/globals.css` so the whole system stays themeable.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ocean-inspired palette (dark → light).
        abyss: "#04070D",
        deep: "#0A1524",
        ocean: "#0E2A47",
        marine: "#1E6FB8",
        current: "#2E8BC0",
        aqua: "#38C6D9",
        foam: "#CFE3EC",
        mist: "#EAF2F6",
        // Safety "beacon" accent — used sparingly for signal / emphasis.
        beacon: "#FF9F45",
        // Semantic tokens driven by CSS variables (theme-aware).
        background: "hsl(var(--background) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        primary: "hsl(var(--primary) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Large-typography scale for a premium, editorial feel.
        display: ["clamp(2.75rem, 6vw, 5.5rem)", { lineHeight: "1.02", letterSpacing: "-0.03em" }],
        headline: ["clamp(2rem, 4vw, 3.5rem)", { lineHeight: "1.06", letterSpacing: "-0.02em" }],
        title: ["clamp(1.5rem, 2.4vw, 2.25rem)", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
      },
      maxWidth: {
        content: "72rem",
        prose: "44rem",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      backdropBlur: {
        glass: "18px",
      },
      boxShadow: {
        glass: "0 8px 40px -12px rgba(4, 7, 13, 0.5)",
        glow: "0 0 60px -12px rgba(56, 198, 217, 0.35)",
      },
      transitionTimingFunction: {
        swell: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        drift: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        drift: "drift 8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
