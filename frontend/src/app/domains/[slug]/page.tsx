import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { domains, getDomain, groupedProducts, productsIn } from "@/data/products";
import { Starfield } from "@/components/effects/Starfield";
import { Icon } from "@/components/ui/Icon";
import { ProductCard } from "@/components/ui/ProductCard";
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

  const groups = groupedProducts(domain);

  return (
    <main className={styles.page} style={{ "--domain": `var(${domain.accent})` } as CSSProperties}>
      <Starfield />
      <SiteNav />

      <div className={styles.body}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>
            <Link href="/#domains" className={styles.crumb}>Domain Intelligence</Link>
            <span aria-hidden="true">/</span>
            <span>{domain.name}</span>
          </p>
          <h1 className={styles.title}>{domain.name}</h1>
          {domain.subLayer && <span className={styles.subLayer}>{domain.subLayer}</span>}
          <p className={styles.description}>{domain.description}</p>
        </header>

        {groups.map((group, i) => (
          <section key={group.name ?? `group-${i}`} className={styles.group}>
            {group.name && <h2 className={styles.groupTitle}>{group.name}</h2>}
            <div className={styles.grid}>
              {group.products.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          </section>
        ))}

        <Link href="/#domains" className={styles.back}>
          <Icon name="chevronLeft" size={14} />
          Back to the orbit
        </Link>
      </div>
    </main>
  );
}
