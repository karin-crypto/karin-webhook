import { Container } from "@/components/layout/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";

/** Consistent hero band for interior section pages. */
export function PageHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro: string;
}) {
  return (
    <header className="border-b border-border/50">
      <Container className="flex flex-col gap-5 py-[clamp(3.5rem,8vw,7rem)]">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="text-headline max-w-3xl">{title}</h1>
        <p className="max-w-prose text-body text-muted">{intro}</p>
      </Container>
    </header>
  );
}
