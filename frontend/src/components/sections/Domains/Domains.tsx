import type { CSSProperties } from "react";
import { domainsSection } from "@/config/content";
import { domains, groupedProducts, logoFor, photoFor } from "@/data/products";
import { DeepSpace } from "@/components/effects/DeepSpace";
import { MobileDomainList } from "@/components/ui/MobileDomainList";
import { Deck, type DeckItem } from "@/components/ui/Deck";
import styles from "./Domains.module.css";

/** The same photographs the domain pages open with, so the deck and the page agree. */
const domainItems: readonly DeckItem[] = domains.map((domain) => ({
  key: domain.slug,
  image: photoFor(domain.slug),
  /* The fan is hidden below 1024px, so only the desktop width is worth fetching. */
  sizes: "270px",
  name: domain.shortName ?? domain.name,
  href: `/domains/${domain.slug}`,
  accent: domain.accent,
}));

/**
 * The stop after Delhi: VcurX AI's four domains as a fanned card deck, and under it
 * every domain's products, group by group, as the domain pages lay them out. Small
 * screens get the plain list instead, which already nests products under domains.
 */
export function Domains() {
  return (
    <section id={domainsSection.id} className={styles.section} aria-labelledby="domains-title">
      <DeepSpace />

      <div className={styles.inner}>
        <header className={styles.header}>
          <h2 id="domains-title" className={styles.title}>{domainsSection.title}</h2>
        </header>

        <Deck items={domainItems} narrow="hide" className={styles.deck} />

        <div className={styles.catalog}>
          {domains.map((domain) => (
            <section
              key={domain.slug}
              className={styles.domain}
              aria-labelledby={`catalog-${domain.slug}`}
              style={{ "--domain": `var(${domain.accent})` } as CSSProperties}
            >
              <header className={styles.domainHead}>
                <h3 id={`catalog-${domain.slug}`} className={styles.domainName}>{domain.name}</h3>
                {domain.subLayer && <span className={styles.subLayer}>{domain.subLayer}</span>}
              </header>

              {groupedProducts(domain).map((group, i) => (
                <div key={group.name ?? `group-${i}`} className={styles.group}>
                  {group.name && <p className={styles.groupTitle}>{group.name}</p>}
                  <Deck
                    narrow="hide"
                    items={group.products.map((product) => ({
                      key: product.slug,
                      image: photoFor(product.slug),
                      logo: logoFor(product),
                      sizes: "270px",
                      name: product.name,
                      href: `/products/${product.slug}`,
                      accent: domain.accent,
                    }))}
                  />
                </div>
              ))}
            </section>
          ))}
        </div>

        <MobileDomainList />
      </div>
    </section>
  );
}
