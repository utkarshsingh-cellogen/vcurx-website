import type { CSSProperties } from "react";
import styles from "./AvatarStack.module.css";

type AvatarStackProps = {
  initials: readonly string[];
  /** Count shown in the trailing "+N" bubble. */
  extra?: number;
};

const GRADIENTS = [
  "linear-gradient(135deg, #f6c9a4, #c9643b)",
  "linear-gradient(135deg, #b7d6ff, #4f74c9)",
  "linear-gradient(135deg, #cfe9d9, #3f8f6d)",
  "linear-gradient(135deg, #e8d3ff, #8a5bc9)",
];

/** Overlapping initials avatars, e.g. for team or community counts. */
export function AvatarStack({ initials, extra }: AvatarStackProps) {
  return (
    <div className={styles.stack} aria-hidden="true">
      {initials.map((name, i) => (
        <span
          key={name}
          className={styles.avatar}
          style={{ "--bg": GRADIENTS[i % GRADIENTS.length] } as CSSProperties}
        >
          {name}
        </span>
      ))}
      {extra ? <span className={`${styles.avatar} ${styles.extra}`}>+{extra}</span> : null}
    </div>
  );
}
