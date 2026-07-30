import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RoadmapNote } from "@/components/ui/RoadmapNote";

export const metadata: Metadata = {
  title: "Media",
  description:
    "News, updates, and press resources for KARINA AI — the home for the platform's blog and media library.",
};

/** Reserves the home for the blog and press/media library. */
export default function MediaPage() {
  return (
    <>
      <PageHeader
        eyebrow="Media"
        title="Follow the journey."
        intro="Announcements, product updates, and press resources will live here as KARINA AI develops in the open."
      />

      <Section>
        <SectionHeading
          eyebrow="Coming to this section"
          title="A blog and a press library."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <RoadmapNote phase="Phase 7">
            The blog (articles, updates, and maritime-safety writing) is powered
            by the content foundation and rendered here. No posts are published
            in Phase 1.
          </RoadmapNote>
          <RoadmapNote phase="Phase 7">
            A press &amp; media library (brand assets, imagery, contact) is added
            for journalists and partners.
          </RoadmapNote>
        </div>
      </Section>
    </>
  );
}
