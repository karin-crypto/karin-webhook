import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { AiBadge } from "@/components/ui/AiBadge";
import { site } from "@/lib/site";

/**
 * Home hero. Large typography, clear AI framing, no invented claims —
 * it states what KARINA is and what the platform is for.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <Container className="flex flex-col items-start gap-8 py-[clamp(5rem,12vw,10rem)]">
        <AiBadge className="animate-fade-up" />

        <h1 className="text-display max-w-4xl animate-fade-up [animation-delay:60ms]">
          Maritime safety,
          <br />
          <span className="text-accent">answered</span> by KARINA.
        </h1>

        <p className="max-w-prose text-body text-muted animate-fade-up [animation-delay:120ms]">
          {site.description} She is an AI character — always identified as one —
          built to make knowledge at sea clear, calm, and available to everyone
          aboard.
        </p>

        <div className="flex flex-wrap gap-3 animate-fade-up [animation-delay:180ms]">
          <Button href="/meet-karina">Meet KARINA</Button>
          <Button href="/ai-assistant" variant="glass">
            See the AI assistant
          </Button>
        </div>
      </Container>
    </section>
  );
}
