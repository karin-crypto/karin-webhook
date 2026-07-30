import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <p className="text-small uppercase tracking-[0.2em] text-accent">Off course</p>
      <h1 className="text-headline">This page drifted out of range.</h1>
      <p className="max-w-prose text-body text-muted">
        The page you were looking for isn&apos;t here. Let&apos;s get you back to
        familiar waters.
      </p>
      <Button href="/">Return home</Button>
    </Container>
  );
}
