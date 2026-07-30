import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Section } from "@/components/ui/Section";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { RoadmapNote } from "@/components/ui/RoadmapNote";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the KARINA AI team about partnerships, pilots, press, and general enquiries.",
};

const field =
  "w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-body text-foreground placeholder:text-muted/70 focus-visible:ring-2 focus-visible:ring-accent";

/**
 * Contact page. The form is a real, accessible, semantic shell. Submission is
 * wired to a server action / API route in Phase 2 (see RoadmapNote); an email
 * fallback is provided so the page is genuinely usable today.
 */
export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Start a conversation."
        intro="Whether you are exploring a partnership, a pilot, or simply curious about KARINA — we would like to hear from you."
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <GlassPanel>
            <form className="flex flex-col gap-5" aria-describedby="contact-note">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-small text-muted">
                  Name
                  <input className={field} name="name" type="text" autoComplete="name" required />
                </label>
                <label className="flex flex-col gap-2 text-small text-muted">
                  Email
                  <input className={field} name="email" type="email" autoComplete="email" required />
                </label>
              </div>
              <label className="flex flex-col gap-2 text-small text-muted">
                Organization <span className="text-muted/60">(optional)</span>
                <input className={field} name="organization" type="text" />
              </label>
              <label className="flex flex-col gap-2 text-small text-muted">
                Message
                <textarea className={field} name="message" rows={5} required />
              </label>
              <p id="contact-note" className="text-xs text-muted">
                Form submission is connected in Phase 2. In the meantime, email
                works below.
              </p>
              <button
                type="submit"
                disabled
                className="inline-flex w-fit items-center justify-center rounded-full bg-accent px-6 py-3 text-small font-medium text-abyss disabled:opacity-50"
              >
                Send message
              </button>
            </form>
          </GlassPanel>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-title">Email</h2>
              <a href="mailto:hello@karina.ai" className="text-body text-accent hover:underline">
                hello@karina.ai
              </a>
              <p className="text-small text-muted">
                (Placeholder address — replace with the project&apos;s real inbox
                before launch.)
              </p>
            </div>
            <RoadmapNote phase="Phase 2">
              A server action / API route handles submissions, spam protection,
              and CRM routing. The form markup above is the finished, accessible
              foundation for it.
            </RoadmapNote>
          </div>
        </div>
      </Section>
    </>
  );
}
