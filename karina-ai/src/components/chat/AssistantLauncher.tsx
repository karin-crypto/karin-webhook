import Link from "next/link";

/**
 * Persistent entry point to KARINA's AI assistant.
 *
 * PHASE 1: a static, accessible launcher that links to the AI Assistant
 * section. It is the reserved SEAM for the live conversational widget
 * (chat → voice → video avatar) added in later phases. When the real widget
 * lands, this becomes a client island that opens an in-page panel; the
 * placement and markup contract stay the same.
 */
export function AssistantLauncher() {
  return (
    <div className="fixed bottom-5 right-5 z-40 print:hidden">
      <Link
        href="/ai-assistant"
        aria-label="Open KARINA — AI maritime safety assistant"
        className="glass group flex items-center gap-3 rounded-full py-3 pl-4 pr-5 transition-all duration-300 ease-swell hover:shadow-glow"
      >
        <span
          aria-hidden
          className="relative flex h-8 w-8 items-center justify-center rounded-full bg-accent/20"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-accent animate-drift" />
        </span>
        <span className="text-small font-medium">Ask KARINA</span>
      </Link>
    </div>
  );
}
