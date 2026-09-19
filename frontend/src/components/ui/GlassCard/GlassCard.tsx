import type { ReactNode } from "react";
import styles from "./GlassCard.module.css";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
};

/** Frosted-glass tile used for stats and small widgets. */
export function GlassCard({ children, className }: GlassCardProps) {
  return <div className={`${styles.card} ${className ?? ""}`}>{children}</div>;
}
