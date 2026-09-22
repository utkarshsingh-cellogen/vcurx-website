import { domainsSection } from "@/config/content";
import { domains, productsIn } from "@/data/products";
import { DeepSpace } from "@/components/effects/DeepSpace";
import { MobileDomainList } from "@/components/ui/MobileDomainList";
import { Deck, type DeckItem } from "@/components/ui/Deck";
import { DomainArt } from "@/components/ui/DomainArt";
import styles from "./Domains.module.css";

/** Drawn artwork rather than photographs here: the deck sits in deep space. */
const items: readonly DeckItem[] = domains.map((domain) => {
  const count = productsIn(domain.slug).length;
  return {
    key: domain.slug,
    art: <DomainArt slug={domain.slug} />,
    badge: domain.subLayer ?? "Core domain",
    name: domain.shortName ?? domain.name,
    handle: `@${domain.slug}`,
    meta: `${count} ${count === 1 ? "product" : "products"}`,
    href: `/domains/${domain.slug}`,
    accent: domain.accent,
  };
});

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
