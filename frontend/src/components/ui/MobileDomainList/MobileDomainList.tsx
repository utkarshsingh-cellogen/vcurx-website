import Link from "next/link";
import type { CSSProperties } from "react";
import { domains, groupedProducts, productsIn } from "@/data/products";
import { Icon } from "@/components/ui/Icon";
import styles from "./MobileDomainList.module.css";

type MobileDomainListProps = {
  className?: string;
};

/** The orbit's content as a plain accordion: domain › sub-layer › group › products. */
export function MobileDomainList({ className }: MobileDomainListProps) {
  return (
    <ul className={`${styles.list} ${className ?? ""}`}>
      {domains.map((domain) => {
        const count = productsIn(domain.slug).length;
        return (
          <li key={domain.slug} style={{ "--domain": `var(${domain.accent})` } as CSSProperties}>
            <details className={styles.domain}>
              <summary className={styles.summary}>
                <span className={styles.marker} aria-hidden="true" />
                <span className={styles.name}>{domain.name}</span>
                <span className={styles.count}>{count}</span>
                <Icon name="chevronRight" size={14} className={styles.chevron} />
              </summary>

              <div className={styles.body}>
                {domain.subLayer && <span className={styles.subLayer}>{domain.subLayer}</span>}

                {groupedProducts(domain).map((group, i) => (
                  <div key={group.name ?? `group-${i}`} className={styles.group}>
                    {group.name && <span className={styles.groupLabel}>{group.name}</span>}
                    <ul className={styles.products}>
                      {group.products.map((product) => (
                        <li key={product.slug}>
                          <Link href={`/products/${product.slug}`} className={styles.product}>
                            {product.name}
                            <Icon name="arrowUpRight" size={12} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                <Link href={`/domains/${domain.slug}`} className={styles.domainLink}>
                  Open domain
                  <Icon name="arrowUpRight" size={12} />
                </Link>
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
