import { Inter, Sora } from "next/font/google";

/**
 * Typography pairing for the luxury-technology aesthetic:
 *  - Sora  → display / headings (geometric, modern, confident)
 *  - Inter → body / UI (highly legible, neutral)
 *
 * Both are loaded via next/font with `display: "swap"` and exposed as CSS
 * variables consumed by Tailwind (`font-display`, `font-sans`).
 */
export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const fontDisplay = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
