"use client";

import type { CSSProperties, Ref } from "react";
import type { Domain } from "@/data/products";
import styles from "./DomainNode.module.css";

type DomainNodeProps = {
  domain: Domain;
  /** Product count shown inside the disc. */
  count: number;
  state: "idle" | "active" | "dimmed";
  ref?: Ref<HTMLButtonElement>;
  onSelect: (slug: Domain["slug"]) => void;
  onHover: (slug: Domain["slug"] | null) => void;
};

/** A domain as a planet on the orbit: a labelled disc that can be hovered, focused and opened. */
export function DomainNode({ domain, count, state, ref, onSelect, onHover }: DomainNodeProps) {
  return (
    <button
      ref={ref}
      type="button"
      className={styles.node}
      data-state={state}
      style={{ "--domain": `var(${domain.accent})` } as CSSProperties}
      aria-label={`${domain.name} — ${count} ${count === 1 ? "product" : "products"}`}
      onClick={() => onSelect(domain.slug)}
      onPointerEnter={() => onHover(domain.slug)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(domain.slug)}
      onBlur={() => onHover(null)}
    >
      <span className={styles.label} aria-hidden="true">{domain.name}</span>
      <span className={styles.disc} aria-hidden="true">{count}</span>
    </button>
  );
}
