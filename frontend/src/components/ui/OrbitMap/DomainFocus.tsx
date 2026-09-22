"use client";

import Link from "next/link";
import { Fragment, useLayoutEffect, useRef, useState, type CSSProperties, type Ref } from "react";
import { groupedProducts, productsIn, type Domain, type Product } from "@/data/products";
import { Icon } from "@/components/ui/Icon";
import { ProductMoon } from "@/components/ui/ProductMoon";
import styles from "./OrbitMap.module.css";

/** Radii of the product ellipse, as a fraction of the stage box. */
const RX = 0.33;
const RY = 0.34;
/**
 * Room a moon needs outside its dot for the longest product name, which is
 * 20 mono characters. Labels never wrap, so on a narrow stage the ellipse has
 * to pull in or the outermost names run off the edge.
 */
const LABEL_ROOM = 170;
const MIN_RX = 0.16;

/** The widest horizontal radius that still leaves every label on the stage. */
function horizontalRadius(width: number): number {
  if (width <= 0) return RX;
  return Math.max(MIN_RX, Math.min(RX, 0.5 - LABEL_ROOM / width));
}
/** One arc per group, mirrored about the vertical axis, each running top to bottom. */
const ARCS = [
  { start: 212, end: 148 },
  { start: 328, end: 392 },
] as const;
/** How far above its arc a group's label sits, in degrees. */
const LABEL_LEAD = 19;

type Column = { name?: string; products: readonly Product[] };

/** Two arcs of moons: one per group, or the domain's products split evenly when it has none. */
function columnsFor(domain: Domain): readonly [Column, Column] {
  const buckets = groupedProducts(domain);
  if (domain.groups.length >= 2) return [buckets[0], buckets[1]];
  const all = buckets[0].products;
  const half = Math.ceil(all.length / 2);
  return [{ products: all.slice(0, half) }, { products: all.slice(half) }];
}

/** A point on the ellipse, plus the spoke that reaches it from the core. */
function place(degrees: number, width: number, height: number, rx: number) {
  const angle = (degrees * Math.PI) / 180;
  const dx = width * rx * Math.cos(angle);
  const dy = height * RY * Math.sin(angle);
  return {
    x: width / 2 + dx,
    y: height / 2 + dy,
    length: Math.hypot(dx, dy),
    tilt: Math.atan2(dy, dx),
  };
}

type DomainFocusProps = {
  domain: Domain;
  backRef: Ref<HTMLButtonElement>;
  onBack: () => void;
};

/** The zoomed-in state of the orbit: one domain, its sub-layer, its groups and their products. */
export function DomainFocus({ domain, backRef, onBack }: DomainFocusProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => setSize({ width: root.clientWidth, height: root.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const columns = columnsFor(domain);
  const rx = horizontalRadius(size.width);
  const count = productsIn(domain.slug).length;

  return (
    <div
      ref={rootRef}
      className={styles.focus}
      style={{ "--domain": `var(${domain.accent})` } as CSSProperties}
    >
      <button ref={backRef} type="button" className={styles.back} onClick={onBack}>
        <Icon name="chevronLeft" size={14} />
        Back to all domains
      </button>

      <span className={styles.focusRing} aria-hidden="true" />

      {columns.map((column, side) => {
        const arc = ARCS[side];
        const label = column.name ? place(arc.start - LABEL_LEAD, size.width, size.height, rx) : null;

        return (
          <Fragment key={column.name ?? `side-${side}`}>
            {label && (
              <span
                className={`${styles.groupLabel} ${side === 0 ? styles.groupLeft : styles.groupRight}`}
                style={{ "--x": `${label.x}px`, "--y": `${label.y}px` } as CSSProperties}
              >
                {column.name}
              </span>
            )}

            {column.products.map((product, i) => {
              const steps = column.products.length - 1;
              const t = steps > 0 ? i / steps : 0.5;
              const point = place(arc.start + (arc.end - arc.start) * t, size.width, size.height, rx);
              const delay = 0.16 + side * 0.04 + i * 0.05;

              return (
                <Fragment key={product.slug}>
                  <span
                    className={styles.spoke}
                    style={{
                      "--length": `${point.length}px`,
                      "--angle": `${point.tilt}rad`,
                      "--delay": `${delay}s`,
                    } as CSSProperties}
                    aria-hidden="true"
                  />
                  <ProductMoon
                    product={product}
                    side={side === 0 ? "left" : "right"}
                    x={point.x}
                    y={point.y}
                    delay={delay}
                  />
                </Fragment>
              );
            })}
          </Fragment>
        );
      })}

      <div className={styles.focusCore}>
        <span className={styles.focusDisc} aria-hidden="true">{count}</span>
        <h3 className={styles.focusName}>{domain.name}</h3>
        {domain.subLayer && <span className={styles.subLayer}>{domain.subLayer}</span>}
        <Link href={`/domains/${domain.slug}`} className={styles.focusLink}>
          Open domain
          <Icon name="arrowUpRight" size={12} />
        </Link>
      </div>
    </div>
  );
}
