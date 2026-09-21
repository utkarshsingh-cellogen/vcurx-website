import { statusLabels, type ProductStatus } from "@/data/products";
import styles from "./StatusTag.module.css";

type StatusTagProps = {
  status: ProductStatus;
  className?: string;
};

/** Small mono pill: Live / Beta / In lab. */
export function StatusTag({ status, className }: StatusTagProps) {
  return (
    <span className={`${styles.tag} ${styles[status === "in-lab" ? "inLab" : status]} ${className ?? ""}`}>
      <span className={styles.dot} aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}
