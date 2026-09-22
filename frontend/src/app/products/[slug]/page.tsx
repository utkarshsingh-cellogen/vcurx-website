import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import {
  getDomain,
  getProduct,
  photoFor,
  products,
  productsIn,
  statusLabels,
} from "@/data/products";
import { Deck, type DeckItem } from "@/components/ui/Deck";
import { DeckCard } from "@/components/ui/DeckCard";
import { Icon } from "@/components/ui/Icon";
import { SiteNav } from "@/components/ui/SiteNav";
import { StatusTag } from "@/components/ui/StatusTag";
import styles from "./page.module.css";

/** Shown until a product supplies its own `steps`. */
const DEFAULT_STEPS = [
  "TODO — what goes in.",
  "TODO — what the model does with it.",
  "TODO — what you get back.",
] as const;

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  return { title: product.name, description: product.oneLiner };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const domain = getDomain(product.domain);
  const steps = product.steps ?? DEFAULT_STEPS;

  const siblings: readonly DeckItem[] = productsIn(product.domain)
    .filter((other) => other.slug !== product.slug)
    .slice(0, 5)
    .map((other) => ({
      key: other.slug,
      image: photoFor(other.slug),
      sizes: "(max-width: 1023px) 45vw, 260px",
      badge: statusLabels[other.status],
      name: other.name,
      handle: `@${other.slug}`,
      meta: other.group ?? domain?.shortName ?? domain?.name ?? "VcurX AI",
      href: `/products/${other.slug}`,
      accent: domain?.accent,
    }));

  return (
    <main
      className={styles.page}
      data-theme="light"
      style={domain ? ({ "--domain": `var(${domain.accent})` } as CSSProperties) : undefined}
    >
      <div className={styles.nav}>
        <SiteNav />
      </div>

      <div className={styles.body}>
        <header className={styles.header}>
          <div className={styles.portrait}>
            <DeckCard
              size="hero"
              image={photoFor(product.slug)}
              priority
              sizes="(max-width: 1023px) 90vw, 420px"
              badge={domain?.subLayer ?? statusLabels[product.status]}
              name={product.name}
              handle={`@${product.slug}`}
              meta={domain?.name ?? "VcurX AI"}
              href={domain ? `/domains/${domain.slug}` : "/#domains"}
              cta="Domain"
              accent={domain?.accent}
            />
          </div>

          <div className={styles.intro}>
            <p className={styles.eyebrow}>
              <Link href="/#domains" className={styles.crumb}>Domain Intelligence</Link>
              <span aria-hidden="true">/</span>
              {domain && (
                <Link href={`/domains/${domain.slug}`} className={styles.crumb}>{domain.name}</Link>
              )}
              {product.group && (
                <>
                  <span aria-hidden="true">/</span>
                  <span>{product.group}</span>
                </>
              )}
            </p>

            <h1 className={styles.title}>{product.name}</h1>
            <StatusTag status={product.status} className={styles.status} />
            <p className={styles.summary}>{product.oneLiner}</p>

            <section className={styles.block}>
              <h2 className={styles.blockTitle}>The problem</h2>
              <p className={styles.prose}>
                {product.problem ?? "TODO — the problem this product exists to solve."}
              </p>
            </section>

            <section className={styles.block}>
              <h2 className={styles.blockTitle}>How it works</h2>
              <ol className={styles.steps}>
                {steps.map((step, i) => (
                  <li key={i} className={styles.step}>
                    <span className={styles.stepNumber} aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.stepText}>{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </header>

        {siblings.length > 0 && domain && (
          <section className={styles.more}>
            <h2 className={styles.moreTitle}>More in {domain.name}</h2>
            <Deck items={siblings} />
          </section>
        )}

        <Link href={domain ? `/domains/${domain.slug}` : "/#domains"} className={styles.back}>
          <Icon name="chevronLeft" size={14} />
          {domain ? `Back to ${domain.name}` : "Back to the orbit"}
        </Link>
      </div>
    </main>
  );
}
