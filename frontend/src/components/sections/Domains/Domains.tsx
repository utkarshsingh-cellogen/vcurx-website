import { domainsSection } from "@/config/content";
import { domains, photoFor } from "@/data/products";
import { DeepSpace } from "@/components/effects/DeepSpace";
import { MobileDomainList } from "@/components/ui/MobileDomainList";
import { Deck, type DeckItem } from "@/components/ui/Deck";
import styles from "./Domains.module.css";

/** The same photographs the domain pages open with, so the deck and the page agree. */
const items: readonly DeckItem[] = domains.map((domain) => ({
  key: domain.slug,
  image: photoFor(domain.slug),
  /* The fan is hidden below 1024px, so only the desktop width is worth fetching. */
  sizes: "270px",
  name: domain.shortName ?? domain.name,
  href: `/domains/${domain.slug}`,
  accent: domain.accent,
}));

/**
 * The stop after Delhi: VcurX AI and its four domains, as a fanned card deck on
 * desktop and as a plain list on small screens.
 */
export function Domains() {
  return (
    <section id={domainsSection.id} className={styles.section} aria-labelledby="domains-title">
      <DeepSpace />

      <div className={styles.inner}>
        <header className={styles.header}>
          <h2 id="domains-title" className={styles.title}>{domainsSection.title}</h2>
        </header>

        <Deck items={items} narrow="hide" />
        <MobileDomainList />
      </div>
    </section>
  );
}
