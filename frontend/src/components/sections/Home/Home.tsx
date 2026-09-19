import { home } from "@/config/content";
import { Globe } from "@/components/effects/Globe";
import { Starfield } from "@/components/effects/Starfield";
import styles from "./Home.module.css";

/** Earth, alone in space: a large turning globe centred in the section. */
export function Home() {
  return (
    <section id={home.id} className={styles.section} aria-label="Earth">
      <Starfield />
      <div className={styles.globe}>
        <Globe />
      </div>
    </section>
  );
}
