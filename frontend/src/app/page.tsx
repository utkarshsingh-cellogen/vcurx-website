import { toNext } from "@/config/content";
import { Hero } from "@/components/sections/Hero";
import { Domains } from "@/components/sections/Domains";
import { PlanetSwitch } from "@/components/sections/PlanetSwitch";

/**
 * This page is one 420vh scroll journey, so a restored scroll position drops the
 * visitor mid-flight with nothing to orient them. Runs during parse, before the
 * browser gets to restore anything — an effect would restore first and then jump.
 *
 * `scrollRestoration` belongs to this history entry alone, so other pages keep
 * their normal back-button behaviour.
 */
const START_AT_TOP = `if("scrollRestoration" in history)history.scrollRestoration="manual";if(!location.hash)window.scrollTo(0,0);`;

export default function HomePage() {
  return (
    <main id="top">
      <script dangerouslySetInnerHTML={{ __html: START_AT_TOP }} />
      <Hero />
      <Domains />
      <PlanetSwitch content={toNext} tone="earth" />
    </main>
  );
}
