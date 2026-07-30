import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { AiBadge } from "@/components/ui/AiBadge";
import { primaryNav, footerNav, site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface/40">
      <Container className="grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <span className="font-display text-lg font-semibold">
            KARINA<span className="text-accent"> AI</span>
          </span>
          <p className="max-w-xs text-small text-muted">{site.description}</p>
          <AiBadge className="mt-1" />
        </div>

        <nav aria-label="Sections">
          <h3 className="mb-4 text-small font-medium text-foreground">Platform</h3>
          <ul className="space-y-2 text-small text-muted">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Legal">
          <h3 className="mb-4 text-small font-medium text-foreground">More</h3>
          <ul className="space-y-2 text-small text-muted">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>

      <Container className="flex flex-col gap-2 border-t border-border/60 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>© {site.name}. KARINA is an AI character.</span>
        <span>Built for the sea.</span>
      </Container>
    </footer>
  );
}
