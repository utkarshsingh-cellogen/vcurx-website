import { siteConfig } from "@/config/site";
import { toEarth } from "@/config/content";
import { PlanetSwitch } from "@/components/sections/PlanetSwitch";
import { CosmicBackground } from "@/components/effects/CosmicBackground";
import { Parallax } from "@/components/effects/Parallax";
import { ScrollStage } from "@/components/effects/ScrollStage";
import styles from "./Hero.module.css";

export function Hero() {
  const { tagline } = siteConfig.hero;

  return (
    <ScrollStage className={styles.hero} stageClassName={styles.stage}
      destination={<PlanetSwitch content={toEarth} tone="earth" embedded />}
      destinationClassName={styles.destination}>
      <CosmicBackground />
      <p className={styles.description}>Scroll from Earth into India, then enter Delhi to continue exploring.</p>

      {/* Fades and lifts away as the planet approaches on scroll */}
      <div className={styles.scrollAway}>
        <Parallax className={styles.content}>
          <h1 className={styles.mark}>
            {/*
             * The whole reveal — the V unfurling, CUR- wiping in, the X flare and
             * its drifting pixels — lives in the file's own keyframes, so this has
             * to stay a plain <img>: routing it through the image optimizer would
             * rasterise it and the animation would be lost.
             */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.logo}
              src="/vcurx-logo.svg"
              alt={`${siteConfig.name} — ${tagline}`}
              width={2400}
              height={1000}
              fetchPriority="high"
            />
          </h1>
        </Parallax>
      </div>
    </ScrollStage>
  );
}
