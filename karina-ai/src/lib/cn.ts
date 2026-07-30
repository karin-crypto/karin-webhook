/**
 * Minimal className joiner (no runtime deps). Filters falsy values so
 * conditional classes stay readable: cn("a", cond && "b").
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
