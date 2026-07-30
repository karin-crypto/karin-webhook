import { cn } from "@/lib/cn";

/**
 * Persistent, honest signal that KARINA is an AI character. Used wherever
 * KARINA "speaks" or is represented, so users are never misled.
 */
export function AiBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-accent",
        className,
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent animate-drift" />
      AI character
    </span>
  );
}
