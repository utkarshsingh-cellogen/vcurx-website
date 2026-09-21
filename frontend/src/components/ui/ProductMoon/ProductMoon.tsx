import Link from "next/link";
import type { CSSProperties } from "react";
import type { Product } from "@/data/products";
import styles from "./ProductMoon.module.css";

type ProductMoonProps = {
  product: Product;
  /** Which way the label runs from its moon — outward, away from the core. */
  side: "left" | "right";
  /** Position on the focused domain's ellipse, in pixels from the stage's top-left. */
  x: number;
  y: number;
  /** Stagger, in seconds. */
  delay?: number;
};

/** A product as a small labelled moon on a focused domain's orbit. */
export function ProductMoon({ product, side, x, y, delay = 0 }: ProductMoonProps) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className={`${styles.moon} ${styles[side]}`}
      style={{ "--x": `${x}px`, "--y": `${y}px`, "--delay": `${delay}s` } as CSSProperties}
    >
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label}>{product.name}</span>
    </Link>
  );
}
