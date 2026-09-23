import { domainsSection } from "@/config/content";
import { domains } from "@/data/products";
import { DeepSpace } from "@/components/effects/DeepSpace";
import { MobileDomainList } from "@/components/ui/MobileDomainList";
import { GalaxyRow, type GalaxyItem } from "@/components/ui/GalaxyRow";
import styles from "./Domains.module.css";

const items: readonly GalaxyItem[] = domains.map((domain) => ({
  key: domain.slug,
  name: domain.shortName ?? domain.name,
  href: `/domains/${domain.slug}`,
  accent: domain.accent,
}));

/**
 * The stop after Delhi: VcurX AI and its four domains, as a row of turning galaxies
 * on desktop and as a plain list on small screens.
 */
export function Domains() {
  return (
    <section id={domainsSection.id} className={styles.section} aria-labelledby="domains-title">
      <DeepSpace />

      <div className={styles.inner}>
        <header className={styles.header}>
          <h2 id="domains-title" className={styles.title}>{domainsSection.title}</h2>
        </header>

        <GalaxyRow items={items} narrow="hide" />
        <MobileDomainList />
      </div>
    </section>
  );
}
