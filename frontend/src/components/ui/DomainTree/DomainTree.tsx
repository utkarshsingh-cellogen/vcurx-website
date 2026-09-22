"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { domains, groupedProducts, productsIn, type DomainSlug, type Product } from "@/data/products";
import { Icon } from "@/components/ui/Icon";
import { StatusTag } from "@/components/ui/StatusTag";
import styles from "./DomainTree.module.css";

type Filter = DomainSlug | "all";

/** The products hanging off one group, with the bracket that ties them together. */
function Leaves({ products }: { products: readonly Product[] }) {
  return (
    <ul className={styles.leaves}>
      {products.map((product) => (
        <li key={product.slug} className={styles.leafRow}>
          <Link href={`/products/${product.slug}`} className={styles.leaf}>
            <span className={styles.leafName}>{product.name}</span>
            <StatusTag status={product.status} className={styles.leafStatus} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * The whole map as one chart: VcurX AI at the root, the four domains branching
 * below it, and every sub-layer, group and product underneath. Connectors are
 * drawn in CSS, so they stay crisp at 1px and reflow with the columns.
 */
export function DomainTree() {
  const [filter, setFilter] = useState<Filter>("all");
  const total = domains.reduce((n, d) => n + productsIn(d.slug).length, 0);
  const filtered = filter !== "all";

  return (
    <div className={styles.root}>
      <nav className={styles.filters} aria-label="Filter by domain">
        <button
          type="button"
          className={styles.chip}
          data-active={filter === "all"}
          onClick={() => setFilter("all")}
        >
          All domains
          <span className={styles.chipCount}>{total}</span>
        </button>
        {domains.map((domain) => (
          <button
            key={domain.slug}
            type="button"
            className={styles.chip}
            data-active={filter === domain.slug}
            style={{ "--domain": `var(${domain.accent})` } as CSSProperties}
            onClick={() => setFilter(filter === domain.slug ? "all" : domain.slug)}
          >
            {domain.shortName ?? domain.name}
            <span className={styles.chipCount}>{productsIn(domain.slug).length}</span>
          </button>
        ))}
      </nav>

      <div className={styles.chart} data-filtered={filtered}>
        <div className={styles.rootNode}>
          <span className={styles.rootName}>VcurX AI</span>
          <span className={styles.rootRole}>Our Domain Intelligence</span>
        </div>

        <span className={styles.trunk} aria-hidden="true" />
        <span className={styles.bus} aria-hidden="true" />

        <ol className={styles.columns}>
          {domains.map((domain) => {
            const count = productsIn(domain.slug).length;
            const groups = groupedProducts(domain);
            // Two named groups are siblings, so they fork apart rather than
            // stacking, which reads as one flowing into the next.
            const forked = groups.length >= 2 && groups.every((group) => group.name);
            const dimmed = filtered && filter !== domain.slug;

            return (
              <li
                key={domain.slug}
                className={styles.column}
                data-dimmed={dimmed}
                style={{ "--domain": `var(${domain.accent})` } as CSSProperties}
              >
                <Link href={`/domains/${domain.slug}`} className={styles.domainNode}>
                  <span className={styles.domainName}>{domain.name}</span>
                  <span className={styles.domainCount}>{String(count).padStart(2, "0")}</span>
                  <Icon name="arrowUpRight" size={13} className={styles.domainArrow} />
                </Link>

                {domain.subLayer && (
                  <>
                    <span className={styles.stem} aria-hidden="true" />
                    <span className={styles.subLayer}>{domain.subLayer}</span>
                  </>
                )}

                {forked ? (
                  <>
                    <span className={styles.stem} aria-hidden="true" />
                    <span className={styles.forkBar} aria-hidden="true" />
                    <div className={styles.groups}>
                      {groups.map((group) => (
                        <div key={group.name} className={styles.branch}>
                          <span className={styles.groupName}>{group.name}</span>
                          <Leaves products={group.products} />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  groups.map((group, i) => (
                    <div key={group.name ?? `group-${i}`} className={styles.group}>
                      {group.name && (
                        <>
                          <span className={styles.stem} aria-hidden="true" />
                          <span className={styles.groupName}>{group.name}</span>
                        </>
                      )}
                      <Leaves products={group.products} />
                    </div>
                  ))
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
