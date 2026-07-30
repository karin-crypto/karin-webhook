import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { RoadmapNote } from "@/components/ui/RoadmapNote";

export const metadata: Metadata = {
  title: "Partners",
  description:
    "Partnership opportunities for schools, academies, charter companies, marine equipment makers, and rescue organizations.",
};

const partnerTypes = [
  "Sailing schools",
  "Maritime academies",
  "Charter companies",
  "Marine equipment companies",
  "Rescue organizations",
];

/** Invites partnerships honestly — no fake logos, counts, or endorsements. */
export default function PartnersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Partners"
        title="Build the future of maritime safety with us."
        intro="KARINA AI is designed to work alongside the organizations that keep people safe at sea. We are opening conversations with early partners and pilots."
      />

      <Section>
        <SectionHeading
          eyebrow="Who we work with"
          title="Where KARINA fits."
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partnerTypes.map((t) => (
            <GlassPanel as="li" key={t}>
              <h3 className="text-body font-medium">{t}</h3>
            </GlassPanel>
          ))}
        </ul>

        <div className="mt-10 flex flex-col gap-6">
          <RoadmapNote phase="Ongoing">
            This section will feature confirmed partners only. Until partnerships
            are established and approved, no logos, names, or endorsements are
            shown — nothing here is invented.
          </RoadmapNote>
          <div>
            <Button href="/contact">Discuss a partnership</Button>
          </div>
        </div>
      </Section>
    </>
  );
}
