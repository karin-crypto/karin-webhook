import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";

/** Closing call-to-action. Honest, forward-looking, no fabricated urgency. */
export function CtaBand() {
  return (
    <Section>
      <div className="glass relative overflow-hidden rounded-3xl px-8 py-16 text-center sm:px-16">
        <div aria-hidden className="ocean-wash absolute inset-0 -z-10" />
        <h2 className="text-headline mx-auto max-w-2xl">
          A new kind of presence at sea is taking shape.
        </h2>
        <p className="mx-auto mt-4 max-w-prose text-body text-muted">
          Follow KARINA&apos;s development, explore the technology, or reach out
          about partnerships and pilots.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button href="/technology">Explore the technology</Button>
          <Button href="/contact" variant="glass">
            Get in touch
          </Button>
        </div>
      </div>
    </Section>
  );
}
