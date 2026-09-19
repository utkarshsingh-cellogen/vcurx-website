import styles from "./Starfield.module.css";

type StarfieldProps = {
  className?: string;
};

/** Lightweight CSS-only field of faint, slowly twinkling stars for section backgrounds. */
export function Starfield({ className }: StarfieldProps) {
  return (
    <div className={`${styles.root} ${className ?? ""}`} aria-hidden="true">
      <div className={styles.layerA} />
      <div className={styles.layerB} />
    </div>
  );
}
