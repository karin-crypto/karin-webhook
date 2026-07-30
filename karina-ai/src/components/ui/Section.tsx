import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/cn";

/**
 * Vertical rhythm wrapper for a page section. Handles consistent spacing and
 * an optional `id` for in-page anchors / navigation.
 */
export function Section({
  children,
  id,
  className,
  bleed = false,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
  /** When true, skips the inner Container (for full-bleed layouts). */
  bleed?: boolean;
}) {
  return (
    <section id={id} className={cn("py-[clamp(4.5rem,9vw,9rem)]", className)}>
      {bleed ? children : <Container>{children}</Container>}
    </section>
  );
}
