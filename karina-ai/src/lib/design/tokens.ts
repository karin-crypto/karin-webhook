/**
 * KARINA AI — Design tokens (single source of truth).
 *
 * These constants document the design system in one place. Tailwind mirrors
 * them in `tailwind.config.ts`; CSS custom properties mirror the semantic
 * (theme-aware) subset in `src/app/globals.css`. Use these when a value is
 * needed in TypeScript (e.g. canvas/WebGL, chart theming, meta theme-color).
 */

/** Ocean-inspired palette, deep → light. */
export const palette = {
  abyss: "#04070D",
  deep: "#0A1524",
  ocean: "#0E2A47",
  marine: "#1E6FB8",
  current: "#2E8BC0",
  aqua: "#38C6D9",
  foam: "#CFE3EC",
  mist: "#EAF2F6",
  /** Safety "beacon" accent — used sparingly for signal / emphasis. */
  beacon: "#FF9F45",
} as const;

/** Typographic scale — deliberately large for an editorial, premium feel. */
export const typeScale = {
  display: "clamp(2.75rem, 6vw, 5.5rem)",
  headline: "clamp(2rem, 4vw, 3.5rem)",
  title: "clamp(1.5rem, 2.4vw, 2.25rem)",
  body: "1.0625rem",
  small: "0.9375rem",
} as const;

/** Spacing rhythm (rem) used for vertical section cadence. */
export const spacing = {
  sectionY: "clamp(4.5rem, 9vw, 9rem)",
  gutter: "clamp(1.25rem, 4vw, 2.5rem)",
} as const;

/** Motion — calm, ocean-like easing. Respect prefers-reduced-motion. */
export const motion = {
  easeSwell: "cubic-bezier(0.22, 1, 0.36, 1)",
  durationBase: "0.7s",
} as const;

export type Palette = typeof palette;
