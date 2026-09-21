"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { SectionId, RichText as RichTextValue } from "@/config/content";
import { useDestinationReady } from "@/components/effects/ScrollStage/ScrollStage";
import { revealTimings } from "@/lib/revealSequence";
import { Starfield } from "@/components/effects/Starfield";
import { Icon } from "@/components/ui/Icon";
import { PlanetSwitcher } from "@/components/ui/PlanetSwitcher";
import { RichText } from "@/components/ui/RichText";
import styles from "./PlanetSwitch.module.css";

type PlanetSwitchProps = {
  content: {
    id: string;
    title: RichTextValue;
    body: string;
    cta: { label: string; href: string };
    active: SectionId;
  };
  /** Accent glow: warm for Mars, blue for Earth — both over the same starry black. */
  tone: "mars" | "earth";
  embedded?: boolean;
};

/** Interlude between planets: a centred prompt, a CTA to the next section and the planet switcher. */
export function PlanetSwitch({ content, tone, embedded = false }: PlanetSwitchProps) {
  const { id, title, body, cta, active } = content;
  const sectionRef = useRef<HTMLElement>(null);
  const destinationReady = useDestinationReady();
  const [inView, setInView] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [headingLines, setHeadingLines] = useState(2);
  const [bodyLines, setBodyLines] = useState(2);
  const playing = destinationReady && inView && fontsReady;
  const timing = revealTimings(headingLines, bodyLines);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let disposed = false;
    void document.fonts.ready.then(() => {
      if (!disposed) setFontsReady(true);
    });
    const heading = section.querySelector("h2");
    const observer = new IntersectionObserver((entries) => {
      // Enter when the heading is actually visible, not when the section's empty
      // top padding touches the viewport. Keep controls shown as it scrolls past.
      if (entries.some((entry) => entry.target === section && !entry.isIntersecting)) {
        setInView(false);
      } else if (entries.some((entry) => entry.target === heading && entry.isIntersecting && entry.intersectionRatio >= 0.5)) {
        setInView(true);
      }
    }, { threshold: [0, 0.5], rootMargin: "0px 0px -8% 0px" });
    observer.observe(section);
    if (heading) observer.observe(heading);
    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, []);

  return (
    <section ref={sectionRef} id={id} data-sequence={playing ? "playing" : "waiting"}
      style={{ "--button-delay": `${timing.button}s` } as CSSProperties}
      className={`${styles.section} ${styles[tone]} ${embedded ? styles.embedded : ""}`}>
      <Starfield />
      <div className={styles.backdrop} aria-hidden="true" />

      <div className={styles.center}>
        <RichText value={title} className={styles.title} reveal play={playing} onLineCount={setHeadingLines} />
        <RichText value={[{ hl: body }]} as="p" className={styles.body} reveal play={playing}
          delay={timing.description} onLineCount={setBodyLines} />
        <div>
          <a href={cta.href} className={styles.cta}>
            <span className={styles.ctaLabel}>{cta.label}<Icon name="arrowUpRight" size={14} /></span>
          </a>
        </div>
      </div>

      <div className={styles.switcher}>
        <PlanetSwitcher active={active} reveal playing={playing} delay={timing.selector} />
      </div>
    </section>
  );
}
