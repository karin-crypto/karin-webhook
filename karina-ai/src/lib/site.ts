import type { NavItem, AudienceSegment, PlatformCapability } from "@/types";

/**
 * Site-wide configuration: identity, navigation, and the structured content
 * that defines the platform's information architecture. Kept free of any
 * invented statistics, testimonials, or certifications.
 */
export const site = {
  name: "KARINA AI",
  /** KARINA is always presented clearly as an AI character. */
  tagline: "An AI maritime safety character.",
  description:
    "KARINA AI is a digital platform built around KARINA, an AI maritime safety character created to educate, interact, and deliver training experiences at sea.",
  locale: "en",
  url: "https://karina.ai",
} as const;

/** Primary navigation — mirrors the eight core sections of the architecture. */
export const primaryNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Meet KARINA", href: "/meet-karina" },
  { label: "AI Assistant", href: "/ai-assistant" },
  { label: "Training", href: "/training" },
  { label: "Technology", href: "/technology" },
  { label: "Partners", href: "/partners" },
  { label: "Media", href: "/media" },
  { label: "Contact", href: "/contact" },
];

/** Stated target audiences for the platform (from the product brief). */
export const audiences: AudienceSegment[] = [
  { title: "Yacht owners", note: "Confident, informed ownership." },
  { title: "Skippers", note: "Sharper decisions on the water." },
  { title: "Sailing schools", note: "A modern teaching companion." },
  { title: "Charter companies", note: "Safer guests, smoother fleets." },
  { title: "Maritime academies", note: "Scalable, consistent instruction." },
  { title: "Marine equipment companies", note: "Guidance that fits the gear." },
  { title: "Families", note: "Peace of mind for everyone aboard." },
  { title: "Rescue organizations", note: "Preparedness that saves time." },
];

/**
 * Platform capabilities, framed as the product's purpose and roadmap — not as
 * claims of features that already exist. Each maps to a future integration.
 */
export const capabilities: PlatformCapability[] = [
  {
    key: "chat",
    title: "AI chat",
    summary: "Ask KARINA maritime-safety questions in natural language.",
    phase: "Planned",
  },
  {
    key: "voice",
    title: "Voice conversation",
    summary: "Talk with KARINA hands-free, the way you would on a bridge.",
    phase: "Planned",
  },
  {
    key: "avatar",
    title: "Video avatar",
    summary: "A face and presence for KARINA in briefings and lessons.",
    phase: "Planned",
  },
  {
    key: "training",
    title: "Training experiences",
    summary: "Guided, scenario-based learning for real situations at sea.",
    phase: "Planned",
  },
  {
    key: "knowledge",
    title: "Knowledge base",
    summary: "A trustworthy, sourced foundation behind every answer.",
    phase: "Planned",
  },
  {
    key: "accounts",
    title: "Accounts & memberships",
    summary: "Personal progress, saved sessions, and organization access.",
    phase: "Planned",
  },
];

/** Legal / utility links surfaced in the footer. */
export const footerNav: NavItem[] = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" },
];
