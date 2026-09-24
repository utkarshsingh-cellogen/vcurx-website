import { toNext } from "@/config/content";
import { Hero } from "@/components/sections/Hero";
import { Domains } from "@/components/sections/Domains";
import { PlanetSwitch } from "@/components/sections/PlanetSwitch";

/* The root layout starts this page at the top on load; see START_AT_TOP there. */
export default function HomePage() {
  return (
    <main id="top">
      <Hero />
      <Domains />
      <PlanetSwitch content={toNext} tone="earth" />
    </main>
  );
}
