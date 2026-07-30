import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A glass surface for cards/panels. Glass is used deliberately and sparingly
 * — only where layering genuinely improves hierarchy (per the design brief).
 */
export function GlassPanel({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "li";
}) {
  return (
    <Tag className={cn("glass rounded-2xl p-6 sm:p-8", className)}>{children}</Tag>
  );
}
