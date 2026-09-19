import { toEarth, toNext } from "@/config/content";
import { Hero } from "@/components/sections/Hero";
import { Home } from "@/components/sections/Home";
import { PlanetSwitch } from "@/components/sections/PlanetSwitch";

export default function HomePage() {
  return (
    <main id="top">
      <Hero />
      <PlanetSwitch content={toEarth} tone="mars" />
      <Home />
      <PlanetSwitch content={toNext} tone="earth" />
    </main>
  );
}
