import Link from "next/link";
import { siteConfig } from "@/config/site";
import styles from "./SiteNav.module.css";

/** Minimal header for the pages outside the scroll journey: just the wordmark, home. */
export function SiteNav() {
  return (
    <header className={styles.nav}>
      <Link href="/" className={styles.brand}>
        <span className={styles.brandV}>V</span>curX
      </Link>
      <span className={styles.visuallyHidden}>{siteConfig.description}</span>
    </header>
  );
}
