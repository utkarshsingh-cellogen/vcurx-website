import Link from "next/link";
import type { Product } from "@/data/products";
import { Icon } from "@/components/ui/Icon";
import { StatusTag } from "@/components/ui/StatusTag";
import styles from "./ProductCard.module.css";

type ProductCardProps = {
  product: Product;
};

/** One product, as linked on a domain page. */
export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/products/${product.slug}`} className={styles.card}>
      <span className={styles.head}>
        <span className={styles.name}>{product.name}</span>
        <Icon name="arrowUpRight" size={14} className={styles.arrow} />
      </span>
      {product.oneLiner && <span className={styles.line}>{product.oneLiner}</span>}
      <StatusTag status={product.status} className={styles.status} />
    </Link>
  );
}
