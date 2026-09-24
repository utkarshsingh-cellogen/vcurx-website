import type { CSSProperties } from "react";
import { domainsSection } from "@/config/content";
import { domains, groupedProducts, logoFor, photoFor } from "@/data/products";
import { DeepSpace } from "@/components/effects/DeepSpace";
import { MobileDomainList } from "@/components/ui/MobileDomainList";
import { Deck } from "@/components/ui/Deck";
import styles from "./Domains.module.css";

/**
 * The stop after Delhi: VcurX AI's four domains as a tree. Each domain's card sits on
 * the left and a line runs from it to every one of its products, forking once per
 * group with the group's name on the branch. The domain cards drift slower than their
 * products as the page scrolls, so each domain holds while its products pass. Small
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

        <div className={styles.tree}>
          {domains.map((domain) => (
            <section
              key={domain.slug}
              className={styles.domain}
              aria-label={domain.name}
              style={{ "--domain": `var(${domain.accent})` } as CSSProperties}
            >
              <div className={styles.parent}>
                <Deck
                  layout="grid"
                  narrow="hide"
                  items={[
                    {
                      key: domain.slug,
                      image: photoFor(domain.slug),
                      sizes: "240px",
                      name: domain.shortName ?? domain.name,
                      href: `/domains/${domain.slug}`,
                      accent: domain.accent,
                    },
                  ]}
                />
                {domain.subLayer && <span className={styles.subLayer}>{domain.subLayer}</span>}
              </div>

              <div className={styles.branches}>
                {groupedProducts(domain).map((group, i) => (
                  <div key={group.name ?? `group-${i}`} className={styles.branch}>
                    <div className={styles.link}>
                      <span className={styles.wire} aria-hidden="true" />
                      {group.name && (
                        <>
                          <span className={styles.groupName}>{group.name}</span>
                          <span className={styles.wire} aria-hidden="true" />
                        </>
                      )}
                    </div>

                    <Deck
                      layout="grid"
                      narrow="hide"
                      className={styles.products}
                      items={group.products.map((product) => ({
                        key: product.slug,
                        image: photoFor(product.slug),
                        logo: logoFor(product),
                        sizes: "180px",
                        name: product.name,
                        href: `/products/${product.slug}`,
                        accent: domain.accent,
                      }))}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <MobileDomainList />
      </div>
    </section>
  );
}
