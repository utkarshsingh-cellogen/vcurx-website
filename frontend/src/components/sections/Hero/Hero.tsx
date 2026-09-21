import { siteConfig } from "@/config/site";
import { toEarth } from "@/config/content";
import { PlanetSwitch } from "@/components/sections/PlanetSwitch";
import { CosmicBackground } from "@/components/effects/CosmicBackground";
import { Parallax } from "@/components/effects/Parallax";
import { ScrollStage } from "@/components/effects/ScrollStage";
import { AnimatedHeadline } from "@/components/ui/AnimatedHeadline";
import styles from "./Hero.module.css";

export function Hero() {
  const { headline, sparkleIndex, tagline } = siteConfig.hero;

  return (
    <ScrollStage className={styles.hero} stageClassName={styles.stage}
      destination={<PlanetSwitch content={toEarth} tone="earth" embedded />}
      destinationClassName={styles.destination}>
      <CosmicBackground />
      <p className={styles.description}>Scroll from Earth into India, then enter Delhi to continue exploring.</p>

      {/* Fades and lifts away as the planet approaches on scroll */}
      <div className={styles.scrollAway}>
        <Parallax className={styles.content}>
          <AnimatedHeadline
            lines={headline}
            sparkleIndex={sparkleIndex}
            className={styles.headline}
          />
          <p className={styles.tagline}>
            <span className={styles.rule} aria-hidden="true" />
            {tagline}
            <span className={styles.rule} aria-hidden="true" />
          </p>
        </Parallax>
      </div>

      <span className={styles.scrollCue} aria-hidden="true" />
    </ScrollStage>
  );
}
