import styles from "./Sparkle.module.css";

type SparkleProps = {
  className?: string;
};

/**
 * Four-point twinkling star ✦, sized in em so it scales with surrounding text.
 *
 * The entrance and the twinkle both animate `transform`, so they live on two
 * separate elements. Two animations on one element that touch the same property
 * cannot be composited, and both fall back to the main thread.
 */
export function Sparkle({ className }: SparkleProps) {
  return (
    <span className={`${styles.root} ${className ?? ""}`} aria-hidden="true">
      <svg className={styles.sparkle} viewBox="0 0 100 100" focusable="false">
        <path d="M50 0 C53 34 66 47 100 50 C66 53 53 66 50 100 C47 66 34 53 0 50 C34 47 47 34 50 0 Z" />
      </svg>
    </span>
  );
}
