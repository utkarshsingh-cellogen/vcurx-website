import Link from "next/link";
import { siteConfig } from "@/config/site";
import styles from "./SiteNav.module.css";

/** Minimal header for the pages outside the scroll journey. */
export function SiteNav() {
  return (
    <header className={styles.nav}>
      <Link href="/" className={styles.brand}>
        <span className={styles.brandV}>V</span>curX
      </Link>
      <Link href="/#domains" className={styles.link}>
        Domains
      </Link>
      <span className={styles.visuallyHidden}>{siteConfig.description}</span>
    </header>
  );
}
