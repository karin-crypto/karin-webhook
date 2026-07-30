import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { RoadmapNote } from "@/components/ui/RoadmapNote";
import { AiBadge } from "@/components/ui/AiBadge";

export const metadata: Metadata = {
  title: "AI Assistant",
  description:
    "How you will talk with KARINA — text, voice, and a video avatar — all grounded in a trustworthy knowledge base.",
};

const modes = [
  { title: "Chat", body: "Type a question, get a clear, sourced answer.", phase: "Phase 3" },
  { title: "Voice", body: "Speak naturally and listen — hands stay on the helm.", phase: "Phase 4" },
  { title: "Video avatar", body: "A visible presence for briefings and lessons.", phase: "Phase 4" },
];

/** Explains the assistant experience and reserves the seams for it. */
export default function AiAssistantPage() {
  return (
    <>
      <PageHeader
        eyebrow="AI Assistant"
        title="Reach KARINA the way that fits the moment."
        intro="One character, three ways to reach her. Each mode is grounded in the same maintained knowledge base, and each is clearly an AI conversation."
      />

      <Section>
        <div className="mb-8 flex items-center gap-3">
          <AiBadge />
          <span className="text-small text-muted">
            Conversations are with an AI character, not a human.
          </span>
        </div>

        <ul className="grid gap-4 md:grid-cols-3">
          {modes.map((m) => (
            <GlassPanel as="li" key={m.title} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-title">{m.title}</h3>
                <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
                  {m.phase}
                </span>
              </div>
              <p className="text-small text-muted">{m.body}</p>
            </GlassPanel>
          ))}
        </ul>
      </Section>

      <Section className="border-t border-border/50">
        <SectionHeading
          eyebrow="The conversation surface"
          title="Where the live assistant will live."
          intro="This section reserves the space and the technical seam for KARINA's interactive assistant. In Phase 1 it is intentionally not functional."
        />
        <div className="mt-8">
          <RoadmapNote phase="Phase 3–4">
            The real-time chat, voice, and avatar experience mounts here. The
            foundation already includes the launcher, routing, and environment
            seams (see <code>.env.example</code>) needed to switch it on.
          </RoadmapNote>
        </div>
      </Section>
    </>
  );
}
