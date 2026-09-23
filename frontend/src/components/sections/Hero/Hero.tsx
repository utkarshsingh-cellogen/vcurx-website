import { siteConfig } from "@/config/site";
import { CosmicZoom } from "@/components/effects/CosmicZoom";
import { Parallax } from "@/components/effects/Parallax";
import { AnimatedHeadline } from "@/components/ui/AnimatedHeadline";
import styles from "./Hero.module.css";

/** The opening screen: the wordmark on the left, the whole Earth on the right, which then pulls back to the Milky Way. */
export function Hero() {
  const { headline, sparkleIndex, tagline } = siteConfig.hero;

  return (
    <section className={styles.hero}>
      <CosmicZoom />

      <Parallax className={styles.content}>
        <AnimatedHeadline lines={headline} sparkleIndex={sparkleIndex} className={styles.headline} />
        <p className={styles.tagline}>
          <span className={styles.rule} aria-hidden="true" />
          {tagline}
          <span className={styles.rule} aria-hidden="true" />
        </p>
      </Parallax>
    </section>
  );
}
