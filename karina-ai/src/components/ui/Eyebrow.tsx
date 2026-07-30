import { cn } from "@/lib/cn";

/** Small uppercase label that sits above a headline. */
export function Eyebrow({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-small font-medium uppercase tracking-[0.2em] text-accent",
        className,
      )}
    >
      <span aria-hidden className="h-px w-6 bg-accent/60" />
      {children}
    </span>
  );
}
