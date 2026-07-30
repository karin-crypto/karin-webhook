import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { AiBadge } from "@/components/ui/AiBadge";

export const metadata: Metadata = {
  title: "Meet KARINA",
  description:
    "KARINA is an AI maritime safety character — who she is, what she stands for, and how she is designed to help.",
};

/** Establishes KARINA's identity, clearly and honestly as an AI character. */
export default function MeetKarinaPage() {
  return (
    <>
      <PageHeader
        eyebrow="Meet KARINA"
        title="An AI character with one purpose: safety at sea."
        intro="KARINA is not a person, and never pretends to be. She is an AI maritime safety character — a consistent, patient guide designed to make the right knowledge available at the right moment."
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col gap-6">
            <AiBadge />
            <p className="text-title text-foreground/90">
              She exists to lower the distance between a question at sea and a
              clear, trustworthy answer.
            </p>
            <p className="text-body text-muted">
              Everything about KARINA is built to earn trust: transparency about
              what she is, answers grounded in a maintained knowledge base, and a
              calm presence that helps people think clearly under pressure.
            </p>
          </div>

          <GlassPanel className="flex flex-col gap-4">
            <h3 className="text-title">Principles</h3>
            <ul className="flex flex-col gap-3 text-small text-muted">
              <li>Always identified as an AI character.</li>
              <li>Grounded in a maintained maritime knowledge base.</li>
              <li>Clear about what she does and does not know.</li>
              <li>Designed for calm, high-stakes moments.</li>
              <li>Accessible to everyone aboard.</li>
            </ul>
          </GlassPanel>
        </div>
      </Section>

      <Section className="border-t border-border/50">
        <SectionHeading
          eyebrow="Character &amp; voice"
          title="Consistent, calm, and honest."
          intro="KARINA's personality, tone, and visual identity are defined here as the platform grows — the foundation is a clear commitment to transparency."
        />
      </Section>
    </>
  );
}
