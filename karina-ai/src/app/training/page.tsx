import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RoadmapNote } from "@/components/ui/RoadmapNote";

export const metadata: Metadata = {
  title: "Training",
  description:
    "Scenario-based maritime safety training experiences guided by KARINA — designed for individuals, schools, and academies.",
};

/** Training vision and the reserved space for the future course platform. */
export default function TrainingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Training"
        title="Learn by doing, guided by KARINA."
        intro="Training experiences turn maritime safety knowledge into practice — scenario-based, paced to the learner, and consistent across every crew and classroom."
      />

      <Section>
        <SectionHeading
          eyebrow="The approach"
          title="From knowledge to instinct."
          intro="The training experience is designed around realistic situations at sea rather than rote memorization. The structure below is the foundation for the course platform."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <RoadmapNote phase="Phase 5">
            The course platform — lessons, scenarios, progress tracking, and
            certificates of completion — is built on the accounts and knowledge
            base foundations. No courses are published in Phase 1.
          </RoadmapNote>
          <RoadmapNote phase="Phase 5">
            Organization tools for sailing schools, charter companies, and
            maritime academies (cohorts, seats, reporting) attach here.
          </RoadmapNote>
        </div>
      </Section>
    </>
  );
}
