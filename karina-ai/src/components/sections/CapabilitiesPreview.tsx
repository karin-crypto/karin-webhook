import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { capabilities } from "@/lib/site";

/**
 * Honest capability overview. Each item is labelled with its phase so nothing
 * reads as "already available" before it is. No metrics, no fake proof.
 */
export function CapabilitiesPreview() {
  return (
    <Section id="capabilities">
      <SectionHeading
        eyebrow="What we are building"
        title="One character. A growing set of ways to reach her."
        intro="KARINA AI is designed as a foundation. These capabilities arrive in deliberate phases — each one built on a trustworthy knowledge base."
      />

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {capabilities.map((cap) => (
          <GlassPanel as="li" key={cap.key} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-title">{cap.title}</h3>
              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
                {cap.phase}
              </span>
            </div>
            <p className="text-small text-muted">{cap.summary}</p>
          </GlassPanel>
        ))}
      </ul>
    </Section>
  );
}
