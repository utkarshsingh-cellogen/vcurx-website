"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { sections, type SectionId } from "@/config/content";
import { Icon } from "@/components/ui/Icon";
import styles from "./PlanetSwitcher.module.css";

type PlanetSwitcherProps = {
  active: SectionId;
  className?: string;
  reveal?: boolean;
  playing?: boolean;
  delay?: number;
};

/**
 * Pill of domains with one centred and its neighbours either side. The arrows step
 * the pill along without leaving the page; opening a domain is what its name is for.
 */
export function PlanetSwitcher({ active, className, reveal = false, playing = false, delay = 0 }: PlanetSwitcherProps) {
  // Starts on the domain this section belongs to; the arrows move it from there.
  const [centre, setCentre] = useState(() => Math.max(0, sections.findIndex((section) => section.id === active)));
  const step = (by: number) => setCentre((i) => Math.min(Math.max(i + by, 0), sections.length - 1));
  // The centred domain flanked by its neighbours; the rest fade out past the edges
  const visible = [sections[centre - 1], sections[centre], sections[centre + 1]];

  return (
    <nav className={`${styles.switcher} ${reveal ? styles.reveal : ""} ${playing ? styles.playing : ""} ${className ?? ""}`}
      style={{ "--selector-delay": `${delay}s` } as CSSProperties} aria-label="Domains">
      <Arrow direction="prev" to={sections[centre - 1]} onClick={() => step(-1)} />
      <ul className={styles.pill}>
        {visible.map((section, i) =>
          section ? (
            <li key={section.id}>
              {section.href ? (
                <Link
                  href={section.href}
                  className={`${styles.item} ${i === 1 ? styles.active : ""}`}
                  aria-current={section.id === active ? "true" : undefined}
                >
                  {i === 1 && <Icon name="planet" size={16} />}
                  <span className={styles.itemLabel}>{section.name}</span>
                </Link>
              ) : (
                <span className={`${styles.item} ${styles.soon}`} title="Coming soon">
                  <span className={styles.itemLabel}>{section.name}</span>
                </span>
              )}
            </li>
          ) : (
            <li key={`empty-${i}`} className={styles.item} aria-hidden="true" />
          ),
        )}
      </ul>
      <Arrow direction="next" to={sections[centre + 1]} onClick={() => step(1)} />
    </nav>
  );
}

/**
 * A button, not a link: it slides the pill along rather than going anywhere. There is
 * nothing to step to at either end of the list, so there it is simply disabled.
 */
function Arrow({
  direction,
  to,
  onClick,
}: {
  direction: "prev" | "next";
  to?: (typeof sections)[number];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.arrow} ${to ? "" : styles.disabled}`}
      onClick={onClick}
      disabled={!to}
      aria-label={to ? `Show ${to.name}` : undefined}
    >
      <Icon name={direction === "prev" ? "chevronLeft" : "chevronRight"} size={14} />
    </button>
  );
}
