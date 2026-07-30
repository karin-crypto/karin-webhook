import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";

export const metadata: Metadata = {
  title: "Technology",
  description:
    "The architecture behind KARINA AI — a modern, fast, privacy-respecting platform designed for trustworthy AI at sea.",
};

const pillars = [
  {
    title: "Grounded answers",
    body: "A maintained knowledge base and retrieval layer sit behind KARINA so responses are sourced, not improvised.",
  },
  {
    title: "Modular AI",
    body: "Chat, voice, and avatar are separate, swappable layers over one reasoning core — each can evolve independently.",
  },
  {
    title: "Privacy by design",
    body: "Accounts, data, and conversations are structured to minimize what is collected and to keep users in control.",
  },
  {
    title: "Fast & global",
    body: "A modern rendering and edge strategy keeps the experience quick and responsive wherever users are.",
  },
];

/** Communicates the technical philosophy in accessible terms. */
export default function TechnologyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Technology"
        title="Trustworthy AI, engineered for the sea."
        intro="KARINA AI is built as a premium technology platform: modular, fast, and honest about how it works. These are the principles the architecture is organized around."
      />

      <Section>
        <SectionHeading eyebrow="Principles" title="What the platform is built on." />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {pillars.map((p) => (
            <GlassPanel as="li" key={p.title} className="flex flex-col gap-2">
              <h3 className="text-title">{p.title}</h3>
              <p className="text-small text-muted">{p.body}</p>
            </GlassPanel>
          ))}
        </ul>
        <p className="mt-8 max-w-prose text-small text-muted">
          Full technical documentation lives in the repository under{" "}
          <code>docs/</code>, covering architecture, the design system, data
          entities, and the phased AI integration plan.
        </p>
      </Section>
    </>
  );
}
