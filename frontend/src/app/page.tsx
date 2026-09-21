import { toNext } from "@/config/content";
import { Hero } from "@/components/sections/Hero";
import { Home } from "@/components/sections/Home";
import { PlanetSwitch } from "@/components/sections/PlanetSwitch";

export default function HomePage() {
  return (
    <main id="top">
      <Hero />
      <Home />
      <PlanetSwitch content={toNext} tone="earth" />
    </main>
  );
}
