import { Starfield } from "@/components/effects/Starfield";
import styles from "./DeepSpace.module.css";

type DeepSpaceProps = {
  className?: string;
};

/**
 * A real photograph of the Milky Way, drifting slowly, with the CSS star field
 * twinkling over it. Purely declarative — no canvas, so there is nothing to fail.
 */
export function DeepSpace({ className }: DeepSpaceProps) {
  return (
    <div className={`${styles.root} ${className ?? ""}`} aria-hidden="true">
      <div className={styles.sky} />
      <Starfield className={styles.twinkle} />
      <span className={styles.settle} />
    </div>
  );
}
