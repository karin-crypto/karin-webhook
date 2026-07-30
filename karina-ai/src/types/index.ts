/**
 * Shared domain & UI types for KARINA AI.
 * Kept intentionally small in Phase 1 — expanded alongside real features.
 */

export interface NavItem {
  label: string;
  href: string;
  /** Marks an external link (opens in a new tab). */
  external?: boolean;
}

export interface AudienceSegment {
  title: string;
  note: string;
}

export type CapabilityPhase = "Planned" | "In progress" | "Live";

export interface PlatformCapability {
  key: string;
  title: string;
  summary: string;
  phase: CapabilityPhase;
}

/** Reusable section metadata for page composition. */
export interface SectionMeta {
  eyebrow?: string;
  title: string;
  intro?: string;
}
