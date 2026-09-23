import type { Metadata } from "next";
import Link from "next/link";
import { domains, products } from "@/data/products";
import { Starfield } from "@/components/effects/Starfield";
import { DomainSolarSystem } from "@/components/domains/DomainSolarSystem";
import { DomainTree } from "@/components/ui/DomainTree";
import { Icon } from "@/components/ui/Icon";
import { SiteNav } from "@/components/ui/SiteNav";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Our Domain Intelligence",
  description: `The full VcurX AI map — ${domains.length} domains and ${products.length} products, from research and design through to the clinic.`,
};

export default function DomainsPage() {
  return (
    <main className={styles.page}>
      <Starfield />
      <SiteNav />

      <div className={styles.body}>
        <header className={styles.header}>
          <h1 className={styles.title}>Our Domain Intelligence</h1>
        </header>

        <DomainTree />

        <DomainSolarSystem />

        <Link href="/#domains" className={styles.back}>
          <Icon name="chevronLeft" size={14} />
          Back to the orbit
        </Link>
      </div>
    </main>
  );
}
