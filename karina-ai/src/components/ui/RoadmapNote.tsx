import { GlassPanel } from "@/components/ui/GlassPanel";

/**
 * Honest, first-class marker for functionality reserved for a later phase.
 * Used instead of placeholder/fake content, so the foundation is transparent
 * about what is scaffolding and what is live.
 */
export function RoadmapNote({ phase, children }: { phase: string; children: React.ReactNode }) {
  return (
    <GlassPanel className="flex flex-col gap-2 border-dashed">
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-beacon/40 bg-beacon/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-beacon">
        Roadmap · {phase}
      </span>
      <p className="text-small text-muted">{children}</p>
    </GlassPanel>
  );
}
