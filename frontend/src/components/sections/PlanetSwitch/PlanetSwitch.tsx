import type { PlanetId, RichText as RichTextValue } from "@/config/content";
import { Starfield } from "@/components/effects/Starfield";
import { Icon } from "@/components/ui/Icon";
import { PlanetSwitcher } from "@/components/ui/PlanetSwitcher";
import { Reveal } from "@/components/ui/Reveal";
import { RichText } from "@/components/ui/RichText";
import styles from "./PlanetSwitch.module.css";

type PlanetSwitchProps = {
  content: {
    id: string;
    title: RichTextValue;
    body: string;
    cta: { label: string; href: string };
    active: PlanetId;
  };
  /** Accent glow: warm for Mars, blue for Earth — both over the same starry black. */
  tone: "mars" | "earth";
};

/** Interlude between planets: a centred prompt, a CTA to the next section and the planet switcher. */
export function PlanetSwitch({ content, tone }: PlanetSwitchProps) {
  const { id, title, body, cta, active } = content;
  return (
    <section id={id} className={`${styles.section} ${styles[tone]}`}>
      <Starfield />
      <div className={styles.backdrop} aria-hidden="true" />

      <div className={styles.center}>
        <Reveal>
          <RichText value={title} className={styles.title} />
        </Reveal>
        <Reveal delay={0.15}>
          <p className={styles.body}>{body}</p>
        </Reveal>
        <Reveal delay={0.25}>
          <a href={cta.href} className={styles.cta}>
            {cta.label}
            <Icon name="arrowUpRight" size={14} />
          </a>
        </Reveal>
      </div>

      <Reveal delay={0.1} className={styles.switcher}>
        <PlanetSwitcher active={active} />
      </Reveal>
    </section>
  );
}
