import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import {
  domains,
  getDomain,
  groupedProducts,
  photoFor,
  productsIn,
  statusLabels,
} from "@/data/products";
import { Deck, type DeckItem } from "@/components/ui/Deck";
import { DeckCard } from "@/components/ui/DeckCard";
import { Icon } from "@/components/ui/Icon";
import { SiteNav } from "@/components/ui/SiteNav";
import styles from "./page.module.css";

export function generateStaticParams() {
  return domains.map((domain) => ({ slug: domain.slug }));
}

export async function generateMetadata({ params }: PageProps<"/domains/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const domain = getDomain(slug);
  if (!domain) return {};
  const count = productsIn(domain.slug).length;
  return {
    title: domain.name,
    description: `${domain.name} — ${count} ${count === 1 ? "product" : "products"} in the VcurX AI domain intelligence map.`,
  };
}

export default async function DomainPage({ params }: PageProps<"/domains/[slug]">) {
  const { slug } = await params;
  const domain = getDomain(slug);
  if (!domain) notFound();

  const count = productsIn(domain.slug).length;
  const groups = groupedProducts(domain);

  return (
    <main
      className={styles.page}
      data-theme="light"
      style={{ "--domain": `var(${domain.accent})` } as CSSProperties}
    >
      <div className={styles.nav}>
        <SiteNav />
      </div>

      <div className={styles.body}>
        <header className={styles.header}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>
              <Link href="/#domains" className={styles.crumb}>Domain Intelligence</Link>
              <span aria-hidden="true">/</span>
              <span>{domain.name}</span>
            </p>

            <h1 className={styles.title}>{domain.name}</h1>

            <p className={styles.chips}>
              {domain.subLayer && (
                <span className={`${styles.chip} ${styles.subLayer}`}>{domain.subLayer}</span>
              )}
              <span className={styles.chip}>
                {count} {count === 1 ? "product" : "products"}
              </span>
            </p>

            <p className={styles.description}>{domain.description}</p>
          </div>

          <div className={styles.portrait}>
            <DeckCard
              size="hero"
              image={photoFor(domain.slug)}
              priority
              sizes="(max-width: 1023px) 90vw, 300px"
              badge={domain.subLayer ?? "Core domain"}
              name={domain.name}
              handle={`@${domain.slug}`}
              meta={`${count} ${count === 1 ? "product" : "products"}`}
              href="#products"
              cta="Products"
              accent={domain.accent}
            />
          </div>
        </header>

        {groups.map((group, i) => {
          const items: readonly DeckItem[] = group.products.map((product) => ({
            key: product.slug,
            image: photoFor(product.slug),
            sizes: "(max-width: 1023px) 45vw, 270px",
            badge: statusLabels[product.status],
            name: product.name,
            handle: `@${product.slug}`,
            meta: product.group ?? domain.shortName ?? domain.name,
            href: `/products/${product.slug}`,
            accent: domain.accent,
          }));

          return (
            <section
              key={group.name ?? `group-${i}`}
              id={i === 0 ? "products" : undefined}
              className={styles.group}
            >
              {group.name && <h2 className={styles.groupTitle}>{group.name}</h2>}
              <Deck items={items} />
            </section>
          );
        })}

        <Link href="/#domains" className={styles.back}>
          <Icon name="chevronLeft" size={14} />
          Back to the orbit
        </Link>
      </div>
    </main>
  );
}
