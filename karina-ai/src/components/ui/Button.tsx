import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "glass";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-small font-medium transition-all duration-300 ease-swell disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-abyss hover:shadow-glow hover:brightness-105 active:scale-[0.98]",
  ghost:
    "text-foreground/90 hover:text-foreground hover:bg-white/5",
  glass:
    "glass text-foreground hover:bg-surface/80",
};

/** Link-styled button (default). Use `<ButtonButton>` for real <button>s. */
export function Button({
  children,
  href,
  variant = "primary",
  className,
  ...rest
}: {
  children: ReactNode;
  href: string;
  variant?: Variant;
  className?: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} className={cn(base, variants[variant], className)} {...rest}>
      {children}
    </Link>
  );
}

/** Actual <button> element variant (for future interactive controls). */
export function ButtonButton({
  children,
  variant = "primary",
  className,
  ...rest
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
} & ComponentProps<"button">) {
  return (
    <button className={cn(base, variants[variant], className)} {...rest}>
      {children}
    </button>
  );
}
