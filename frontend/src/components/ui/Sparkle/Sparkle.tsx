import styles from "./Sparkle.module.css";

type SparkleProps = {
  className?: string;
};

/** Four-point twinkling star ✦, sized in em so it scales with surrounding text. */
export function Sparkle({ className }: SparkleProps) {
  return (
    <svg
      className={`${styles.sparkle} ${className ?? ""}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M50 0 C53 34 66 47 100 50 C66 53 53 66 50 100 C47 66 34 53 0 50 C34 47 47 34 50 0 Z" />
    </svg>
  );
}
