import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { primaryNav, site } from "@/lib/site";

/**
 * Global header. Server component for now; a client-side mobile-menu island
 * is added in a later phase without changing this shell's contract.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-glass">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight">
          KARINA<span className="text-accent"> AI</span>
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-7 text-small text-muted">
            {primaryNav.slice(1).map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <Button href="/ai-assistant" variant="glass" className="hidden sm:inline-flex">
            Meet the assistant
          </Button>
          {/* Mobile navigation trigger — interactive island wired in Phase 2. */}
          <Link
            href="/meet-karina"
            className="lg:hidden text-small text-muted hover:text-foreground"
            aria-label="Open navigation"
          >
            Menu
          </Link>
        </div>
      </Container>
      <span className="sr-only">{site.name} — {site.tagline}</span>
    </header>
  );
}
