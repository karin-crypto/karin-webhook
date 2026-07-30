import { Hero } from "@/components/sections/Hero";
import { CapabilitiesPreview } from "@/components/sections/CapabilitiesPreview";
import { AudienceGrid } from "@/components/sections/AudienceGrid";
import { CtaBand } from "@/components/sections/CtaBand";

/** Home — the platform's front door. */
export default function HomePage() {
  return (
    <>
      <Hero />
      <CapabilitiesPreview />
      <AudienceGrid />
      <CtaBand />
    </>
  );
}
