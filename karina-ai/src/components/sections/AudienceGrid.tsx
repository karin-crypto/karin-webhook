import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { audiences } from "@/lib/site";

/** Who the platform is for — drawn directly from the product brief. */
export function AudienceGrid() {
  return (
    <Section id="audience" className="border-y border-border/50 bg-surface/30">
      <SectionHeading
        eyebrow="Built for the whole crew"
        title="From first-time families to rescue teams."
        intro="KARINA meets each audience where they are — the same trustworthy character, tuned to different needs."
      />

      <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/40 sm:grid-cols-2 lg:grid-cols-4">
        {audiences.map((a) => (
          <li key={a.title} className="bg-background/60 p-6">
            <h3 className="text-body font-medium text-foreground">{a.title}</h3>
            <p className="mt-1.5 text-small text-muted">{a.note}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
