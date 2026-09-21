import { domainsSection } from "@/config/content";
import { DeepSpace } from "@/components/effects/DeepSpace";
import { MobileDomainList } from "@/components/ui/MobileDomainList";
import { OrbitMap } from "@/components/ui/OrbitMap";
import styles from "./Domains.module.css";

/**
 * The stop after Delhi: VcurX AI and its four domains, as an orbit on desktop
 * and as a plain list on small screens.
 */
export function Domains() {
  return (
    <section id={domainsSection.id} className={styles.section} aria-labelledby="domains-title">
      <DeepSpace />

      <div className={styles.inner}>
        <header className={styles.header}>
          <h2 id="domains-title" className={styles.title}>{domainsSection.title}</h2>
        </header>

        <OrbitMap className={styles.orbit} />
        <MobileDomainList className={styles.list} />
      </div>
    </section>
  );
}
