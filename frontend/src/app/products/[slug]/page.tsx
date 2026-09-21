import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { getDomain, getProduct, products } from "@/data/products";
import { Starfield } from "@/components/effects/Starfield";
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

  return (
    <main
      className={styles.page}
      style={domain ? ({ "--domain": `var(${domain.accent})` } as CSSProperties) : undefined}
    >
      <Starfield />
      <SiteNav />

      <div className={styles.body}>
        <header className={styles.header}>
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

          <div className={styles.titleRow}>
            <h1 className={styles.title}>{product.name}</h1>
            <StatusTag status={product.status} />
          </div>

          <p className={styles.summary}>{product.oneLiner}</p>
        </header>

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
                <span className={styles.stepNumber} aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.stepText}>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <Link href="/#domains" className={styles.back}>
          <Icon name="chevronLeft" size={14} />
          Back to the orbit
        </Link>
      </div>
    </main>
  );
}
